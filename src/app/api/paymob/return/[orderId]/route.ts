import { getOrder } from "@/lib/server/orders";
import { fromRedirectParams, paymobEnv, verifyRedirectHmac } from "@/lib/server/paymob";
import { paymentsForOrder, processTransaction, recheckOrderPayments } from "@/lib/server/payments";
import { storedOrderToken } from "@/lib/server/order-access";
import { clean } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Where Paymob sends the customer's browser after the payment page. Purely a hand-off back to the order page:
 * a redirect whose HMAC checks out is applied like a callback (the callback usually arrived first, and duplicates are
 * ignored), otherwise the order page confirms with Paymob itself. The order token never leaves this site — it comes
 * from the cookie set when the order was placed.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/paymob/return/[orderId]">) {
  const { orderId: raw } = await ctx.params;
  const orderId = clean(decodeURIComponent(raw), 40);
  const order = orderId ? await getOrder(orderId).catch(() => null) : null;
  const location = (path: string) => new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  if (!order) return location("/");
  const locale = order.locale === "ar" ? "ar" : "en";

  let token = await storedOrderToken(order.id);
  const env = paymobEnv();
  const params = new URL(request.url).searchParams;
  try {
    if (env && params.has("hmac") && verifyRedirectHmac(env.hmacSecret, params)) {
      const txn = fromRedirectParams(params);
      // The signed payment must belong to THIS order — otherwise anyone with a valid redirect of their own could
      // ask for someone else's order link.
      const mine = txn ? (await paymentsForOrder(order.id)).some((p) => p.providerOrderId === txn.providerOrderId) : false;
      if (txn && mine) {
        await processTransaction(txn, "redirect");
        // A signed redirect proves this browser just paid this order, so it may see it even from another device.
        if (!token) token = order.accessToken;
      }
    } else if (env?.apiKey) {
      await recheckOrderPayments(order.id);
    }
  } catch (err) {
    console.error("[paymob/return]", err instanceof Error ? err.message : err);
  }
  return location(`/${locale}/order/${encodeURIComponent(order.id)}${token ? `?t=${encodeURIComponent(token)}` : ""}`);
}
