import "server-only";
import { siteUrl } from "@/lib/site";
import { isOnlineMethod, METHOD_LABEL, type MethodAvailability, type OnlineMethod } from "@/lib/payment-methods";
import { query, transaction } from "./db";
import { randomString } from "./ids";
import { approveOrderTx, type Order } from "./orders";
import { alertOwner, sendOrderPaidEmail } from "./order-mail";
import { createIntention, inquireOrder, parseIntegrationIds, paymobEnv, type PaymobTransaction } from "./paymob";
import { logSecurity } from "./security-log";
import { getSettings, type PublicSettings } from "./settings";

/* ------------------------------------------------------------------------------------------------------------ */
/* Which methods can be offered                                                                                   */
/* ------------------------------------------------------------------------------------------------------------ */

export function onlinePaymentsLive(settings: PublicSettings) {
  return settings.onlinePaymentsEnabled && paymobEnv() !== null;
}

/** Methods the checkout may show. A method needs Paymob keys in the hosting environment AND its integration ID in Settings. */
export function methodAvailability(settings: PublicSettings): MethodAvailability {
  const online = onlinePaymentsLive(settings);
  const has = (v: string) => online && parseIntegrationIds(v).length > 0;
  const m = {
    card: has(settings.paymob.card),
    wallet: has(settings.paymob.wallet),
    instapay: has(settings.paymob.instapay),
    kiosk: has(settings.paymob.kiosk),
    installments: has(settings.paymob.installments),
    transfer: settings.manualPaymentsEnabled,
  };
  // Never leave the checkout with nothing to pay with.
  if (!m.card && !m.wallet && !m.instapay && !m.kiosk && !m.installments) m.transfer = true;
  return m;
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Payment rows                                                                                                   */
/* ------------------------------------------------------------------------------------------------------------ */

export type PaymentStatus = "created" | "pending" | "paid" | "failed" | "refunded" | "voided" | "error" | "mismatch";

type PaymentRow = {
  id: number;
  order_id: string;
  provider: string;
  special_reference: string;
  intention_id: string | null;
  provider_order_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  transaction_id: string | null;
  method: string | null;
  detail: string | null;
  checked_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type Payment = {
  id: number;
  orderId: string;
  status: PaymentStatus;
  /** What the customer chose ("card", "wallet", …) as recorded when the payment was started. */
  choice: string | null;
  /** What Paymob reports (e.g. "card:MasterCard"). */
  method: string | null;
  transactionId: string | null;
  providerOrderId: string | null;
  amount: number;
  detail: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapPayment(r: PaymentRow): Payment {
  // `method` holds the customer's choice ("card", …) until Paymob reports what was really used ("card:MasterCard").
  return {
    id: r.id,
    orderId: r.order_id,
    status: r.status,
    choice: r.method && !r.method.includes(":") && isOnlineMethod(r.method) ? r.method : null,
    method: r.method,
    transactionId: r.transaction_id,
    providerOrderId: r.provider_order_id,
    amount: r.amount_cents / 100,
    detail: r.detail,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function paymentsForOrder(orderId: string): Promise<Payment[]> {
  const rows = await query<PaymentRow>("SELECT * FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 20", [orderId]);
  return rows.map(mapPayment);
}

export async function paymentsForOrders(orderIds: string[]): Promise<Map<string, Payment[]>> {
  const out = new Map<string, Payment[]>();
  if (orderIds.length === 0) return out;
  const rows = await query<PaymentRow>("SELECT * FROM payments WHERE order_id = ANY($1::text[]) ORDER BY id DESC", [orderIds]);
  for (const r of rows) {
    const list = out.get(r.order_id) ?? [];
    list.push(mapPayment(r));
    out.set(r.order_id, list);
  }
  return out;
}

export async function listRecentPayments(limit = 200) {
  const rows = await query<PaymentRow & { customer_name: string; customer_email: string }>(
    `SELECT p.*, o.customer_name, o.customer_email FROM payments p JOIN orders o ON o.id = p.order_id ORDER BY p.id DESC LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({ ...mapPayment(r), customerName: r.customer_name, customerEmail: r.customer_email }));
}

/** Human label for what the customer paid with. */
export function describeMethod(p: Pick<Payment, "method">) {
  const m = p.method ?? "";
  if (isOnlineMethod(m)) return METHOD_LABEL[m];
  const [type, sub] = m.split(":");
  if (type === "card") return sub ? `Card · ${sub}` : "Card";
  if (type === "wallet" || type === "mobile_wallet") return "Mobile wallet";
  if (type === "aggregator" || type === "kiosk") return "Fawry / Aman / Masary";
  if (type === "instapay") return "InstaPay";
  return m || "Online";
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Starting a payment                                                                                             */
/* ------------------------------------------------------------------------------------------------------------ */

export type StartResult = { ok: true; url: string } | { ok: false; error: "not_available" | "not_pending" | "too_many" | "gateway" };

const MAX_ATTEMPTS = 12;

export async function startPayment(order: Order, method: OnlineMethod): Promise<StartResult> {
  if (order.status !== "pending") return { ok: false, error: "not_pending" };
  const env = paymobEnv();
  const settings = await getSettings();
  if (!env || !methodAvailability(settings)[method]) return { ok: false, error: "not_available" };
  const integrationIds = parseIntegrationIds(settings.paymob[method]);
  if (integrationIds.length === 0) return { ok: false, error: "not_available" };

  const [{ n }] = await query<{ n: number }>("SELECT count(*)::int AS n FROM payments WHERE order_id = $1", [order.id]);
  if (n >= MAX_ATTEMPTS) return { ok: false, error: "too_many" };

  const amountCents = Math.round(order.total * 100);
  const specialReference = `${order.id}-${randomString(5)}`;
  const [row] = await query<{ id: number }>(
    "INSERT INTO payments (order_id, provider, special_reference, amount_cents, currency, status, method) VALUES ($1, 'paymob', $2, $3, 'EGP', 'created', $4) RETURNING id",
    [order.id, specialReference, amountCents, method],
  );

  const items = order.items.map((i) => ({
    name: `${i.name} (${i.billing === "yearly" ? "yearly" : "monthly"})`,
    amountCents: Math.round(i.unitPrice * 100),
    quantity: i.quantity,
  }));
  const vatCents = Math.round(order.vat * 100);
  if (vatCents > 0) items.push({ name: `VAT ${order.vatRate}%`, amountCents: vatCents, quantity: 1 });

  try {
    const intention = await createIntention(env, {
      amountCents,
      specialReference,
      integrationIds,
      items,
      customer: order.customer,
      notificationUrl: `${siteUrl}/api/paymob/callback`,
      redirectionUrl: `${siteUrl}/api/paymob/return/${encodeURIComponent(order.id)}`,
      expiresInSeconds: method === "kiosk" || method === "installments" ? 172_800 : 3600,
    });
    await query("UPDATE payments SET intention_id = $2, provider_order_id = $3, updated_at = now() WHERE id = $1", [row.id, intention.intentionId || null, intention.providerOrderId]);
    return { ok: true, url: intention.checkoutUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[payments] could not create the Paymob intention:", message);
    await query("UPDATE payments SET status = 'error', detail = $2, updated_at = now() WHERE id = $1", [row.id, message.slice(0, 400)]);
    return { ok: false, error: "gateway" };
  }
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Processing what Paymob tells us                                                                                */
/* ------------------------------------------------------------------------------------------------------------ */

export type PaymentSource = "callback" | "redirect" | "inquiry" | "admin";

export type ProcessResult =
  | { outcome: "paid"; order: Order }
  | { outcome: "duplicate" | "unknown" | "pending" | "failed" | "refunded" | "voided" | "mismatch" | "duplicate_payment" | "paid_after_close"; orderId?: string };

type Kind = "success" | "pending" | "failed" | "refunded" | "voided";

function classify(t: PaymobTransaction): Kind {
  if (t.isRefunded) return "refunded";
  if (t.isVoided) return "voided";
  // An authorisation that hasn't been captured is not money in the bank yet.
  if (t.success && !t.pending && (!t.isAuth || t.isCapture)) return "success";
  if (t.pending || (t.success && t.isAuth && !t.isCapture)) return "pending";
  return "failed";
}

function methodOf(t: PaymobTransaction) {
  return `${t.methodType || "online"}${t.methodSubType ? `:${t.methodSubType}` : ""}`.slice(0, 60);
}

/**
 * Applies one Paymob transaction to our records. The caller must already have authenticated it (a verified HMAC,
 * or an answer obtained from Paymob's API with our key). Safe to call any number of times with the same
 * transaction: the first call wins and the rest are no-ops.
 */
export async function processTransaction(txn: PaymobTransaction, source: PaymentSource): Promise<ProcessResult> {
  const { renewalGraceDays } = await getSettings(); // read before the transaction (single-connection dev database)
  const kind = classify(txn);

  const result = await transaction(async (tx): Promise<ProcessResult & { note?: string; customerOrder?: Order; payment?: PaymentRow }> => {
    let pay = (await tx.query<PaymentRow>("SELECT * FROM payments WHERE provider = 'paymob' AND provider_order_id = $1 FOR UPDATE", [txn.providerOrderId]))[0];
    if (!pay && txn.merchantOrderId) {
      pay = (await tx.query<PaymentRow>("SELECT * FROM payments WHERE provider = 'paymob' AND special_reference = $1 AND provider_order_id IS NULL FOR UPDATE", [txn.merchantOrderId]))[0];
      if (pay) await tx.query("UPDATE payments SET provider_order_id = $2 WHERE id = $1", [pay.id, txn.providerOrderId]);
    }
    if (!pay) return { outcome: "unknown", note: `Paymob order ${txn.providerOrderId} is not one of ours` };

    const event = async (key: string, outcome: string, detail: string | null) => {
      const rows = await tx.query<{ id: number }>(
        "INSERT INTO payment_events (provider, event_key, payment_id, source, outcome, detail) VALUES ('paymob', $1, $2, $3, $4, $5) ON CONFLICT (provider, event_key) DO NOTHING RETURNING id",
        [key, pay.id, source, outcome, detail],
      );
      return rows.length > 0;
    };
    const setPayment = (status: PaymentStatus, detail: string | null = null) =>
      tx.query("UPDATE payments SET status = $2, transaction_id = $3, method = $4, detail = $5, updated_at = now() WHERE id = $1", [pay.id, status, txn.id, methodOf(txn), detail]);

    // Refunds and voids: record them and tell the owner. Keys are never revoked automatically.
    if (kind === "refunded" || kind === "voided") {
      if (!(await event(`${txn.id}:${kind}`, kind, `EGP ${(txn.amountCents / 100).toFixed(2)}`))) return { outcome: "duplicate", orderId: pay.order_id };
      await tx.query("UPDATE payments SET status = $2, detail = $3, updated_at = now() WHERE id = $1", [pay.id, kind, `EGP ${(txn.amountCents / 100).toFixed(2)} ${kind} (transaction ${txn.id})`]);
      return { outcome: kind, orderId: pay.order_id };
    }

    // The amount and currency must be exactly what we asked for.
    if (txn.currency !== pay.currency || txn.amountCents !== pay.amount_cents) {
      if (!(await event(`${txn.id}:mismatch`, "mismatch", `got ${txn.currency} ${txn.amountCents}, expected ${pay.currency} ${pay.amount_cents}`))) return { outcome: "duplicate", orderId: pay.order_id };
      await tx.query("UPDATE payments SET status = 'mismatch', transaction_id = $2, detail = $3, updated_at = now() WHERE id = $1", [
        pay.id,
        txn.id,
        `Paid ${txn.currency} ${(txn.amountCents / 100).toFixed(2)} but the order is EGP ${(pay.amount_cents / 100).toFixed(2)}`,
      ]);
      return { outcome: "mismatch", orderId: pay.order_id, note: `got ${txn.currency} ${txn.amountCents / 100}, expected ${pay.currency} ${pay.amount_cents / 100}` };
    }

    if (kind === "pending") {
      if (!(await event(`${txn.id}:pending`, "pending", null))) return { outcome: "duplicate", orderId: pay.order_id };
      if (pay.status !== "paid") await setPayment("pending");
      return { outcome: "pending", orderId: pay.order_id };
    }

    if (kind === "failed") {
      if (!(await event(`${txn.id}:failed`, "failed", null))) return { outcome: "duplicate", orderId: pay.order_id };
      if (pay.status !== "paid" && pay.status !== "refunded" && pay.status !== "voided") await setPayment("failed", "The bank or wallet declined the payment.");
      return { outcome: "failed", orderId: pay.order_id };
    }

    // success
    if (!(await event(`${txn.id}:success`, "success", null))) return { outcome: "duplicate", orderId: pay.order_id };
    const order = (await tx.query<{ status: string }>("SELECT status FROM orders WHERE id = $1 FOR UPDATE", [pay.order_id]))[0];
    if (!order) return { outcome: "unknown", note: "order no longer exists" };
    if (order.status === "paid") {
      await setPayment("paid", "The order was already paid — this is a second payment that probably needs refunding.");
      return { outcome: "duplicate_payment", orderId: pay.order_id };
    }
    if (order.status !== "pending") {
      await setPayment("paid", `Paid, but the order is ${order.status}.`);
      return { outcome: "paid_after_close", orderId: pay.order_id };
    }
    const approved = await approveOrderTx(tx, pay.order_id, { graceMs: renewalGraceDays * 86_400_000, paidAt: new Date(), paymentRef: `PAYMOB-${txn.id}` });
    if (!approved) return { outcome: "unknown", note: "order no longer exists" };
    await setPayment("paid");
    return { outcome: "paid", order: approved };
  });

  // Side effects happen after the database commit, and never make a paid order look failed.
  const orderId = "orderId" in result ? result.orderId : result.outcome === "paid" ? result.order.id : undefined;
  try {
    switch (result.outcome) {
      case "paid": {
        await sendOrderPaidEmail(result.order, "online");
        const via = methodOf(txn);
        await alertOwner(
          `Paid online — ${result.order.id} — EGP ${result.order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          `${result.order.customer.name} <${result.order.customer.email}> paid order ${result.order.id} (${via}). Their keys were issued and emailed automatically. Nothing to do.`,
        );
        break;
      }
      case "mismatch":
        await logSecurity("payment_amount_mismatch", `order ${orderId}: ${result.note ?? ""}`);
        await alertOwner(`Payment amount mismatch — ${orderId}`, `Paymob reported a payment for order ${orderId} that does not match the order (${result.note ?? "amount"}). No keys were issued. Check it in Paymob and, if it is fine, use "Mark as paid" on the order.`);
        break;
      case "duplicate_payment":
        await logSecurity("payment_duplicate", `order ${orderId}, transaction ${txn.id}`);
        await alertOwner(`Second payment for ${orderId}`, `Order ${orderId} was already paid and Paymob has just confirmed another payment (transaction ${txn.id}, EGP ${txn.amountCents / 100}). Refund it in the Paymob dashboard.`);
        break;
      case "paid_after_close":
        await alertOwner(`Payment for a closed order — ${orderId}`, `Paymob confirmed a payment (transaction ${txn.id}) for order ${orderId}, which you had already rejected. No keys were issued. Refund it in Paymob, or approve the order.`);
        break;
      case "refunded":
      case "voided":
        await logSecurity("payment_refunded", `order ${orderId}, transaction ${txn.id}, ${result.outcome}`);
        await alertOwner(`Payment ${result.outcome} — ${orderId}`, `Paymob reports a ${result.outcome} (EGP ${txn.amountCents / 100}, transaction ${txn.id}) on order ${orderId}. The customer's keys are still active — revoke them in Admin → License keys if this was a full refund.`);
        break;
      case "unknown":
        await logSecurity("payment_unknown_order", `Paymob order ${txn.providerOrderId}, transaction ${txn.id}`);
        break;
    }
  } catch (err) {
    console.error("[payments] follow-up after processing failed:", err instanceof Error ? err.message : err);
  }
  return result.outcome === "paid" ? { outcome: "paid", order: result.order } : ({ outcome: result.outcome, orderId } as ProcessResult);
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Asking Paymob (safety net for a callback that never arrived)                                                   */
/* ------------------------------------------------------------------------------------------------------------ */

/** Asks Paymob about an order's open payments. `force` skips the 20-second throttle (admin button). */
export async function recheckOrderPayments(orderId: string, force = false): Promise<{ checked: number; paid: boolean }> {
  const env = paymobEnv();
  if (!env?.apiKey) return { checked: 0, paid: false };
  const rows = await query<PaymentRow>(
    `SELECT * FROM payments WHERE order_id = $1 AND provider_order_id IS NOT NULL AND status IN ('created', 'pending')
       AND ($2::boolean OR checked_at IS NULL OR checked_at < now() - interval '20 seconds') ORDER BY id DESC LIMIT 5`,
    [orderId, force],
  );
  let paid = false;
  for (const row of rows) {
    await query("UPDATE payments SET checked_at = now() WHERE id = $1", [row.id]);
    try {
      const txn = await inquireOrder(env, row.provider_order_id!);
      if (!txn) continue;
      const res = await processTransaction(txn, "inquiry");
      if (res.outcome === "paid") paid = true;
    } catch (err) {
      console.error("[payments] inquiry failed:", err instanceof Error ? err.message : err);
    }
  }
  return { checked: rows.length, paid };
}

/** Daily safety net: re-check payments still open after 2 minutes, and clear out abandoned checkouts. */
export async function reconcilePayments() {
  const env = paymobEnv();
  let checked = 0;
  let paid = 0;
  if (env?.apiKey) {
    const open = await query<{ order_id: string }>(
      `SELECT DISTINCT order_id FROM payments WHERE provider_order_id IS NOT NULL AND status IN ('created', 'pending')
         AND created_at > now() - interval '5 days' AND created_at < now() - interval '2 minutes' LIMIT 50`,
    );
    for (const { order_id } of open) {
      const r = await recheckOrderPayments(order_id, true);
      checked += r.checked;
      if (r.paid) paid++;
    }
  }
  // Online checkouts nobody paid for, older than 30 days, only clutter the list.
  const removed = await query<{ id: string }>(
    "DELETE FROM orders WHERE status = 'pending' AND method = 'paymob' AND payment_ref = '' AND created_at < now() - interval '30 days' RETURNING id",
  );
  return { checked, paid, removed: removed.length };
}
