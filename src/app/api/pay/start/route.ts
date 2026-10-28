import { isOnlineMethod } from "@/lib/payment-methods";
import { getOrderForCustomer } from "@/lib/server/orders";
import { rejectCrossSite } from "@/lib/server/origin";
import { startPayment } from "@/lib/server/payments";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { badRequest, readJson } from "@/lib/server/http";
import { storedOrderToken } from "@/lib/server/order-access";
import { clean } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Starts (or restarts) an online payment for an order and returns the secure payment page to send the customer to. */
export async function POST(request: Request) {
  const blocked = await rejectCrossSite(request, "/api/pay/start");
  if (blocked) return blocked;
  if (!(await rateLimit(`paystart:${ipFrom(request)}`, 30, 600))) return Response.json({ ok: false, errors: { form: "rate_limited" } }, { status: 429 });
  const body = await readJson(request);
  if (!body) return badRequest("invalid_body");
  const orderId = clean(body.orderId, 40);
  const method = body.method;
  if (!orderId || !isOnlineMethod(method)) return badRequest("invalid_body");
  const token = clean(body.token, 80) || (await storedOrderToken(orderId));
  const order = await getOrderForCustomer(orderId, token).catch(() => null);
  if (!order) return Response.json({ ok: false, errors: { form: "not_found" } }, { status: 404 });
  if (!(await rateLimit(`paystart-order:${order.id}`, 12, 600))) return Response.json({ ok: false, errors: { form: "rate_limited" } }, { status: 429 });

  const res = await startPayment(order, method);
  if (!res.ok) {
    const status = res.error === "gateway" ? 502 : res.error === "too_many" ? 429 : 409;
    return Response.json({ ok: false, errors: { form: res.error } }, { status });
  }
  return Response.json({ ok: true, url: res.url }, { headers: { "Cache-Control": "no-store" } });
}
