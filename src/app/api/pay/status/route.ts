import { getOrderForCustomer } from "@/lib/server/orders";
import { paymentsForOrder, recheckOrderPayments } from "@/lib/server/payments";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { storedOrderToken } from "@/lib/server/order-access";
import { clean } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Polled by the order page while a payment is being confirmed. Asks Paymob directly if the callback is slow. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id"), 40);
  if (!(await rateLimit(`paystatus:${ipFrom(request)}:${id}`, 150, 600))) return Response.json({ ok: false }, { status: 429 });
  const token = clean(url.searchParams.get("t"), 80) || (await storedOrderToken(id));
  let order = await getOrderForCustomer(id, token).catch(() => null);
  if (!order) return Response.json({ ok: false }, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (order.status === "pending") {
    await recheckOrderPayments(order.id).catch(() => undefined);
    order = (await getOrderForCustomer(id, token).catch(() => null)) ?? order;
  }
  const latest = (await paymentsForOrder(order.id))[0];
  return Response.json({ ok: true, status: order.status, payment: latest?.status ?? null }, { headers: { "Cache-Control": "no-store" } });
}
