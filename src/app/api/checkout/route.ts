import { sanitize } from "@/lib/cart-store";
import { plans } from "@/lib/catalog";
import type { Order } from "@/lib/order";
import { providerFor, isDemoMode, type PaymentMethod } from "@/lib/payments";
import { lineTotal, totals, unitPrice } from "@/lib/pricing";
import { badRequest, readJson, sendEmail } from "@/lib/server/http";
import { invoiceNumber, licenseKey, orderId } from "@/lib/server/ids";
import { clean, EG_MOBILE_RE, EMAIL_RE, isStudentEmail, normalizePhone, normalizeTaxId, TAX_ID_RE } from "@/lib/validation";

const METHODS: PaymentMethod[] = ["card", "fawry", "wallet", "instapay"];

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return badRequest("invalid_body");

  // Prices are always recomputed server-side from the catalog; client totals are ignored.
  const items = sanitize(body.items);
  if (items.length === 0) return badRequest("empty_cart");

  const customer = (body.customer ?? {}) as Record<string, unknown>;
  const name = clean(customer.name, 120);
  const email = clean(customer.email, 160).toLowerCase();
  const phone = normalizePhone(clean(customer.phone, 30));
  const method = body.method as PaymentMethod;

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "name";
  if (!EMAIL_RE.test(email)) errors.email = "email";
  if (!EG_MOBILE_RE.test(phone)) errors.phone = "phone";
  if (!METHODS.includes(method)) errors.method = "generic";

  let business: Order["business"];
  if (body.business && typeof body.business === "object") {
    const b = body.business as Record<string, unknown>;
    const company = clean(b.company, 160);
    const taxId = normalizeTaxId(clean(b.taxId, 20));
    const address = clean(b.address, 240);
    if (company.length < 2) errors.company = "company";
    if (!TAX_ID_RE.test(taxId)) errors.taxId = "taxId";
    business = { company, taxId, address };
  }

  if (items.some((i) => i.plan === "student") && !isStudentEmail(clean(body.studentEmail, 160))) {
    errors.studentEmail = "studentEmail";
  }

  if (Object.keys(errors).length > 0) return badRequest(errors);

  const { subtotal, vat, total } = totals(items);
  const id = orderId();
  const provider = providerFor(method);

  let payment;
  try {
    payment = await provider.createPayment(
      { orderId: id, amount: total, customer: { name, email, phone }, description: `VEYLIX order ${id}` },
      method,
    );
  } catch (err) {
    console.error("[checkout] payment provider error", err);
    return Response.json({ ok: false, errors: { form: "generic" } }, { status: 502 });
  }

  if (payment.status === "redirect") {
    // Real providers: licenses are issued by the webhook after payment confirmation.
    return Response.json({ ok: true, redirect: payment.url });
  }

  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    status: payment.status === "paid" ? "paid" : "pending",
    method,
    fawryReference: payment.status === "pending" ? payment.reference : undefined,
    customer: { name, email, phone },
    business,
    items: items.map((item) => {
      const seats = (plans[item.plan].seats ?? 1) * item.quantity;
      return {
        ...item,
        unitPrice: unitPrice(item),
        lineTotal: lineTotal(item),
        // Keys are only released once payment is confirmed.
        licenseKeys: payment.status === "paid" ? Array.from({ length: Math.min(seats, 50) }, () => licenseKey()) : [],
      };
    }),
    subtotal,
    vat,
    total,
    invoice: {
      number: invoiceNumber(),
      seller: {
        name: process.env.SELLER_LEGAL_NAME ?? "VEYLIX",
        taxId: process.env.SELLER_TAX_ID ?? "",
        address: process.env.SELLER_ADDRESS ?? "Cairo, Egypt",
      },
    },
    demo: isDemoMode(),
  };

  if (order.status === "paid") {
    const keys = order.items.flatMap((i) => i.licenseKeys).join("\n");
    await sendEmail(email, `Your VEYLIX license — ${id}`, `Thanks for your order ${id}.\n\nLicense keys:\n${keys}\n\nInvoice: ${order.invoice.number}`).catch(() => undefined);
  }

  return Response.json({ ok: true, order });
}
