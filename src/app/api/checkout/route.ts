import { createOrder, getOrder, paymentRefUsed, type CartLine } from "@/lib/server/orders";
import { notifyInbox } from "@/lib/server/mail";
import { siteUrl } from "@/lib/site";
import { getKey, workingPaidKeys } from "@/lib/server/license-keys";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { badRequest, readJson } from "@/lib/server/http";
import { rejectCrossSite } from "@/lib/server/origin";
import { rejectBot } from "@/lib/server/bot";
import { rememberOrderToken } from "@/lib/server/order-access";
import { methodAvailability, startPayment } from "@/lib/server/payments";
import { getSettings } from "@/lib/server/settings";
import { isOnlineMethod, isPaymentChoice } from "@/lib/payment-methods";
import { clean, EG_MOBILE_RE, EMAIL_RE, normalizePhone, normalizeTaxId, TAX_ID_RE } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Creates a pending order. Online methods (card, wallet, …) start a payment on Paymob's secure page and the keys are
 * issued automatically when Paymob confirms it; an InstaPay transfer waits for the owner to check it.
 */
export async function POST(request: Request) {
  const blocked = await rejectCrossSite(request, "/api/checkout");
  if (blocked) return blocked;
  if (!(await rateLimit(`checkout:${ipFrom(request)}`, 10, 600))) return Response.json({ ok: false, errors: { form: "rate_limited" } }, { status: 429 });
  const body = await readJson(request);
  if (!body) return badRequest("invalid_body");
  const bot = await rejectBot(request, body, "checkout");
  if (bot) return bot;

  const rawLines = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  const lines: CartLine[] = rawLines
    .map((l) => ({ productId: clean(l?.productId, 40), billing: l?.billing === "yearly" ? ("yearly" as const) : ("monthly" as const), quantity: Number(l?.quantity) || 1 }))
    .filter((l) => l.productId);

  const customer = (body.customer ?? {}) as Record<string, unknown>;
  const name = clean(customer.name, 120);
  const email = clean(customer.email, 160).toLowerCase();
  const phone = normalizePhone(clean(customer.phone, 30));
  const choice = isPaymentChoice(body.paymentMethod) ? body.paymentMethod : "transfer";
  const online = choice !== "transfer";
  const paymentRef = online ? "" : clean(body.paymentRef, 80);
  const renewKey = clean(body.renewKey, 40) || null;
  const locale = body.locale === "ar" ? "ar" : "en";

  const errors: Record<string, string> = {};
  if (!methodAvailability(await getSettings())[choice]) errors.form = "method_unavailable";
  if (name.length < 2) errors.name = "name";
  if (!EMAIL_RE.test(email)) errors.email = "email";
  if (!EG_MOBILE_RE.test(phone)) errors.phone = "phone";
  if (!online && paymentRef.length < 4) errors.paymentRef = "paymentRef";

  let business: { company: string; taxId: string; address: string } | null = null;
  if (body.business && typeof body.business === "object") {
    const b = body.business as Record<string, unknown>;
    const company = clean(b.company, 160);
    const taxId = normalizeTaxId(clean(b.taxId, 20));
    if (company.length < 2) errors.company = "company";
    if (!TAX_ID_RE.test(taxId)) errors.taxId = "taxId";
    business = { company, taxId, address: clean(b.address, 240) };
  }

  // The plugin's "Buy" button passes the PC's device ID, so a PC that already owns the plugin can't pay twice.
  const device = clean(body.device, 64);
  const deviceId = /^W[12]-[0-9A-Fa-f]{40}$/.test(device) ? device : null;

  // One InstaPay transfer pays for one order: a reference already used on a pending or paid order is refused.
  if (!online && !errors.paymentRef) {
    if (paymentRef.toUpperCase().replace(/[^A-Z0-9]/g, "").length < 4) errors.paymentRef = "paymentRef";
    else if (await paymentRefUsed(paymentRef)) errors.paymentRef = "paymentRefUsed";
  }

  if (renewKey) {
    const units = lines.reduce((n, l) => n + Math.max(1, Math.floor(l.quantity)), 0);
    const existing = await getKey(renewKey);
    if (!existing || existing.revoked || units !== 1) errors.renewKey = "renewKey";
    else if (!existing.expiresAt) errors.renewKey = "renewKeyForever";
    else if (existing.productId && lines[0] && existing.productId !== lines[0].productId) errors.renewKey = "renewKeyProduct";
  }
  if (Object.keys(errors).length) return badRequest(errors);

  if (!renewKey) {
    const productIds = [...new Set(lines.map((l) => l.productId))];
    // Hard stop: this PC already has a working paid license for a plugin in the cart.
    if (deviceId && (await workingPaidKeys({ deviceId }, productIds)).length > 0) {
      return Response.json({ ok: false, errors: { form: "device_licensed" } }, { status: 409 });
    }
    // Soft stop: this email already owns one. Teams buy extra PCs on purpose, so the customer can confirm.
    if (body.confirmAdditional !== true) {
      const owned = await workingPaidKeys({ email }, productIds);
      if (owned.length > 0) {
        const names = [...new Set(owned.map((k) => k.productName ?? "VEYLIX"))];
        return Response.json({ ok: false, errors: { form: "already_licensed" }, licensed: names }, { status: 409 });
      }
    }
  }

  const order = await createOrder({ lines, customer: { name, email, phone }, business, method: online ? "paymob" : "instapay", paymentRef, renewKey, locale });
  if (!order) return badRequest("empty_cart");
  await rememberOrderToken(order.id, order.accessToken);

  if (online && isOnlineMethod(choice)) {
    // Send the customer to the secure payment page. If the gateway is briefly unavailable the order still exists and
    // the order page offers "try again".
    const full = await getOrder(order.id);
    const started = full ? await startPayment(full, choice) : null;
    return Response.json(
      { ok: true, id: order.id, token: order.accessToken, ...(started?.ok ? { payUrl: started.url } : { payError: started?.error ?? "gateway" }) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const lines2 = order.items.map((i) => `${i.quantity} × ${i.name} (${i.billing})`).join("\n");
  await notifyInbox(
    `New InstaPay order ${order.id} — EGP ${order.total.toLocaleString("en-US")}`,
    `${name} <${email}> · ${phone}\nInstaPay reference: ${paymentRef}\nTotal: EGP ${order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n\n${lines2}${renewKey ? `\n\nRenews key: ${renewKey}` : ""}\n\nCheck the transfer in your InstaPay app, then approve it in Admin → Orders:\n${siteUrl}/admin/orders?status=pending`,
    email,
  ).catch(() => undefined);
  return Response.json({ ok: true, id: order.id, token: order.accessToken }, { headers: { "Cache-Control": "no-store" } });
}
