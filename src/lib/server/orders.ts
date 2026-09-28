import "server-only";
import { query, transaction } from "./db";
import { accessToken, invoiceNumber, licenseKey, normalizeKey, orderId } from "./ids";
import { getSettings } from "./settings";
import { getProductById } from "./products";

export type Billing = "monthly" | "yearly";

export type OrderItem = {
  productId: string;
  slug: string;
  name: string;
  billing: Billing;
  quantity: number;
  unitPrice: number; // EGP
};

export type IssuedKey = { key: string; productName: string; expiresAt: string | null; renewed?: boolean };

export type Order = {
  id: string;
  accessToken: string;
  status: "pending" | "paid" | "rejected";
  method: string;
  paymentRef: string;
  customer: { name: string; email: string; phone: string };
  business: { company: string; taxId: string; address: string } | null;
  renewKey: string | null;
  items: OrderItem[];
  subtotal: number;
  vat: number;
  total: number;
  vatRate: number;
  licenseKeys: IssuedKey[];
  invoiceNumber: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderRow = {
  id: string;
  access_token: string;
  status: Order["status"];
  method: string;
  payment_ref: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company: string | null;
  tax_id: string | null;
  address: string | null;
  renew_key: string | null;
  items: OrderItem[] | string;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  vat_rate: string | number;
  license_keys: IssuedKey[] | string;
  invoice_number: string | null;
  admin_note: string | null;
  created_at: Date;
  updated_at: Date;
};

const json = <T,>(v: T | string): T => (typeof v === "string" ? (JSON.parse(v) as T) : v);

function map(r: OrderRow): Order {
  return {
    id: r.id,
    accessToken: r.access_token,
    status: r.status,
    method: r.method,
    paymentRef: r.payment_ref,
    customer: { name: r.customer_name, email: r.customer_email, phone: r.customer_phone },
    business: r.company ? { company: r.company, taxId: r.tax_id ?? "", address: r.address ?? "" } : null,
    renewKey: r.renew_key,
    items: json(r.items),
    subtotal: r.subtotal_cents / 100,
    vat: r.vat_cents / 100,
    total: r.total_cents / 100,
    vatRate: Number(r.vat_rate),
    licenseKeys: json(r.license_keys),
    invoiceNumber: r.invoice_number,
    adminNote: r.admin_note,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export type CartLine = { productId: string; billing: Billing; quantity: number };

/** Re-prices the cart from the database. Client-side prices are never trusted. */
export async function priceCart(lines: CartLine[]) {
  const items: OrderItem[] = [];
  for (const line of lines.slice(0, 20)) {
    const product = await getProductById(line.productId);
    if (!product || !product.published) continue;
    const unitPrice = line.billing === "yearly" ? product.priceYearly : product.priceMonthly;
    if (unitPrice == null || unitPrice <= 0) continue;
    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      billing: line.billing,
      quantity: Math.min(50, Math.max(1, Math.floor(line.quantity) || 1)),
      unitPrice,
    });
  }
  const settings = await getSettings();
  const subtotalCents = items.reduce((s, i) => s + i.unitPrice * i.quantity * 100, 0);
  const vatCents = Math.round((subtotalCents * settings.vatRate) / 100);
  return { items, subtotalCents, vatCents, totalCents: subtotalCents + vatCents, vatRate: settings.vatRate };
}

export async function createOrder(input: {
  lines: CartLine[];
  customer: { name: string; email: string; phone: string };
  business: { company: string; taxId: string; address: string } | null;
  paymentRef: string;
  renewKey: string | null;
}) {
  const priced = await priceCart(input.lines);
  if (priced.items.length === 0) return null;
  const id = orderId();
  const token = accessToken();
  await query(
    `INSERT INTO orders (id, access_token, status, method, payment_ref, customer_name, customer_email, customer_phone, company, tax_id, address,
       renew_key, items, subtotal_cents, vat_cents, total_cents, vat_rate)
     VALUES ($1,$2,'pending','instapay',$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15)`,
    [
      id,
      token,
      input.paymentRef,
      input.customer.name,
      input.customer.email,
      input.customer.phone,
      input.business?.company ?? null,
      input.business?.taxId ?? null,
      input.business?.address ?? null,
      input.renewKey ? normalizeKey(input.renewKey) : null,
      JSON.stringify(priced.items),
      priced.subtotalCents,
      priced.vatCents,
      priced.totalCents,
      priced.vatRate,
    ],
  );
  return { id, accessToken: token, items: priced.items, total: priced.totalCents / 100 };
}

export async function getOrder(id: string): Promise<Order | null> {
  const rows = await query<OrderRow>("SELECT * FROM orders WHERE id = $1", [id]);
  return rows[0] ? map(rows[0]) : null;
}

/** Customer-facing lookup: requires the secret token from the order link. */
export async function getOrderForCustomer(id: string, token: string): Promise<Order | null> {
  const order = await getOrder(id);
  if (!order || !token || order.accessToken.length !== token.length) return null;
  const { timingSafeEqual } = await import("node:crypto");
  return timingSafeEqual(Buffer.from(order.accessToken), Buffer.from(token)) ? order : null;
}

export async function listOrders(status: "pending" | "paid" | "rejected" | "all" = "all") {
  const rows =
    status === "all"
      ? await query<OrderRow>("SELECT * FROM orders ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 500")
      : await query<OrderRow>("SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC LIMIT 500", [status]);
  return rows.map(map);
}

export async function pendingOrderCount() {
  const rows = await query<{ n: number | string }>("SELECT count(*)::int AS n FROM orders WHERE status = 'pending'");
  return Number(rows[0]?.n ?? 0);
}

function addPeriod(from: Date, billing: Billing) {
  const dt = new Date(from);
  dt.setMonth(dt.getMonth() + (billing === "yearly" ? 12 : 1));
  return dt;
}

/**
 * Marks an order paid and issues license keys: one per unit, bound to the purchased product and valid
 * for the paid period. A renewal key (if the customer entered one) is extended instead.
 */
export async function approveOrder(id: string) {
  // Read settings before the transaction (the single-connection dev database would deadlock inside it).
  const { renewalGraceDays } = await getSettings();
  const graceMs = renewalGraceDays * 86_400_000;
  return transaction(async (tx) => {
    const rows = await tx.query<OrderRow>("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [id]);
    if (!rows[0]) return null;
    const order = map(rows[0]);
    if (order.status === "paid") return order;

    const now = new Date();
    const issued: IssuedKey[] = [];
    let renewUsed = false;

    for (const item of order.items) {
      for (let unit = 0; unit < item.quantity; unit++) {
        const expiresAt = addPeriod(now, item.billing);

        if (order.renewKey && !renewUsed) {
          const existing = await tx.query<{ id: number; key: string; product_id: string | null; expires_at: Date | null; revoked: boolean }>(
            "SELECT id, key, product_id, expires_at, revoked FROM license_keys WHERE key = $1 FOR UPDATE",
            [order.renewKey],
          );
          const k = existing[0];
          if (k && !k.revoked && (k.product_id === null || k.product_id === item.productId)) {
            // Paid on time (before the end date + grace)? Extend from the old end date, so a month is always a
            // month. Paid after the license lapsed? The new month starts on the day of payment.
            const paidAt = new Date(order.createdAt).getTime();
            const end = k.expires_at ? new Date(k.expires_at).getTime() : null;
            const base = new Date(end !== null && paidAt <= end + graceMs ? end : paidAt);
            const newExpiry = addPeriod(base, item.billing);
            await tx.query("UPDATE license_keys SET expires_at = $2, order_id = $3, assigned_to = COALESCE(assigned_to, $4), trial = false WHERE id = $1", [k.id, newExpiry, order.id, order.customer.email]);
            issued.push({ key: k.key, productName: item.name, expiresAt: newExpiry.toISOString(), renewed: true });
            renewUsed = true;
            continue;
          }
        }

        // Prefer an unused key from the admin's pool for this product; otherwise mint a new one.
        const pooled = await tx.query<{ key: string }>(
          `UPDATE license_keys SET order_id = $2, assigned_to = $3, expires_at = $4
           WHERE id = (
             SELECT id FROM license_keys
             WHERE product_id = $1 AND NOT revoked AND device_id IS NULL AND assigned_to IS NULL AND order_id IS NULL
               AND (expires_at IS NULL OR expires_at > now())
             ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED
           ) RETURNING key`,
          [item.productId, order.id, order.customer.email, expiresAt],
        );
        let key = pooled[0]?.key;
        if (!key) {
          key = licenseKey();
          await tx.query(
            "INSERT INTO license_keys (key, product_id, order_id, assigned_to, expires_at, note) VALUES ($1, $2, $3, $4, $5, $6)",
            [key, item.productId, order.id, order.customer.email, expiresAt, `Order ${order.id}`],
          );
        }
        issued.push({ key, productName: item.name, expiresAt: expiresAt.toISOString() });
      }
    }

    const invoice = order.invoiceNumber ?? invoiceNumber();
    await tx.query("UPDATE orders SET status = 'paid', license_keys = $2::jsonb, invoice_number = $3, updated_at = now() WHERE id = $1", [id, JSON.stringify(issued), invoice]);
    return { ...order, status: "paid" as const, licenseKeys: issued, invoiceNumber: invoice };
  });
}

export async function rejectOrder(id: string, note: string | null) {
  await query("UPDATE orders SET status = 'rejected', admin_note = $2, updated_at = now() WHERE id = $1 AND status = 'pending'", [id, note]);
}
