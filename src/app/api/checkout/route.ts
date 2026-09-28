import { createOrder, type CartLine } from "@/lib/server/orders";
import { notifyInbox } from "@/lib/server/mail";
import { siteUrl } from "@/lib/site";
import { getKey } from "@/lib/server/license-keys";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { badRequest, readJson } from "@/lib/server/http";
import { clean, EG_MOBILE_RE, EMAIL_RE, normalizePhone, normalizeTaxId, TAX_ID_RE } from "@/lib/validation";

/** Creates a pending InstaPay order. Keys are issued when the admin confirms the transfer. */
export async function POST(request: Request) {
  if (!(await rateLimit(`checkout:${ipFrom(request)}`, 10, 600))) return Response.json({ ok: false, errors: { form: "rate_limited" } }, { status: 429 });
  const body = await readJson(request);
  if (!body) return badRequest("invalid_body");

  const rawLines = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  const lines: CartLine[] = rawLines
    .map((l) => ({ productId: clean(l?.productId, 40), billing: l?.billing === "yearly" ? ("yearly" as const) : ("monthly" as const), quantity: Number(l?.quantity) || 1 }))
    .filter((l) => l.productId);

  const customer = (body.customer ?? {}) as Record<string, unknown>;
  const name = clean(customer.name, 120);
  const email = clean(customer.email, 160).toLowerCase();
  const phone = normalizePhone(clean(customer.phone, 30));
  const paymentRef = clean(body.paymentRef, 80);
  const renewKey = clean(body.renewKey, 40) || null;

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "name";
  if (!EMAIL_RE.test(email)) errors.email = "email";
  if (!EG_MOBILE_RE.test(phone)) errors.phone = "phone";
  if (paymentRef.length < 4) errors.paymentRef = "paymentRef";

  let business: { company: string; taxId: string; address: string } | null = null;
  if (body.business && typeof body.business === "object") {
    const b = body.business as Record<string, unknown>;
    const company = clean(b.company, 160);
    const taxId = normalizeTaxId(clean(b.taxId, 20));
    if (company.length < 2) errors.company = "company";
    if (!TAX_ID_RE.test(taxId)) errors.taxId = "taxId";
    business = { company, taxId, address: clean(b.address, 240) };
  }

  if (renewKey) {
    const units = lines.reduce((n, l) => n + Math.max(1, Math.floor(l.quantity)), 0);
    const existing = await getKey(renewKey);
    if (!existing || existing.revoked || units !== 1) errors.renewKey = "renewKey";
  }
  if (Object.keys(errors).length) return badRequest(errors);

  const order = await createOrder({ lines, customer: { name, email, phone }, business, paymentRef, renewKey });
  if (!order) return badRequest("empty_cart");
  const lines2 = order.items.map((i) => `${i.quantity} × ${i.name} (${i.billing})`).join("\n");
  await notifyInbox(
    `New InstaPay order ${order.id} — EGP ${order.total.toLocaleString("en-US")}`,
    `${name} <${email}> · ${phone}\nInstaPay reference: ${paymentRef}\nTotal: EGP ${order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n\n${lines2}${renewKey ? `\n\nRenews key: ${renewKey}` : ""}\n\nCheck the transfer in your InstaPay app, then approve it in Admin → Orders:\n${siteUrl}/admin/orders?status=pending`,
    email,
  ).catch(() => undefined);
  return Response.json({ ok: true, id: order.id, token: order.accessToken });
}
