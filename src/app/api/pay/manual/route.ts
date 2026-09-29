import { getOrderForCustomer, paymentRefUsed, setManualPayment } from "@/lib/server/orders";
import { rejectCrossSite } from "@/lib/server/origin";
import { methodAvailability } from "@/lib/server/payments";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { badRequest, readJson } from "@/lib/server/http";
import { notifyInbox } from "@/lib/server/mail";
import { getSettings } from "@/lib/server/settings";
import { storedOrderToken } from "@/lib/server/order-access";
import { siteUrl } from "@/lib/site";
import { clean } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** The customer couldn't pay online and paid by InstaPay transfer instead: record their reference for the owner to check. */
export async function POST(request: Request) {
  const blocked = await rejectCrossSite(request, "/api/pay/manual");
  if (blocked) return blocked;
  if (!(await rateLimit(`paymanual:${ipFrom(request)}`, 15, 600))) return Response.json({ ok: false, errors: { form: "rate_limited" } }, { status: 429 });
  const body = await readJson(request);
  if (!body) return badRequest("invalid_body");
  const orderId = clean(body.orderId, 40);
  const paymentRef = clean(body.paymentRef, 80);
  const order = await getOrderForCustomer(orderId, clean(body.token, 80) || (await storedOrderToken(orderId))).catch(() => null);
  if (!order) return Response.json({ ok: false, errors: { form: "not_found" } }, { status: 404 });
  if (order.status !== "pending") return badRequest("not_pending");
  if (!methodAvailability(await getSettings()).transfer) return badRequest("not_available");
  if (paymentRef.length < 4) return badRequest({ paymentRef: "paymentRef" });
  if (await paymentRefUsed(paymentRef, order.id)) return badRequest({ paymentRef: "paymentRefUsed" });
  if (!(await setManualPayment(order.id, paymentRef))) return badRequest("not_pending");
  await notifyInbox(
    `New InstaPay order ${order.id} — EGP ${order.total.toLocaleString("en-US")}`,
    `${order.customer.name} <${order.customer.email}> · ${order.customer.phone}\nInstaPay reference: ${paymentRef}\nTotal: EGP ${order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n(They tried to pay online first, then chose an InstaPay transfer.)\n\nCheck the transfer in your InstaPay app, then approve it in Admin → Orders:\n${siteUrl}/admin/orders?status=pending`,
    order.customer.email,
  ).catch(() => undefined);
  return Response.json({ ok: true });
}
