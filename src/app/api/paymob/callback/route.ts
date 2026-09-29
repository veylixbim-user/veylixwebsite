import { fromCallbackObject, paymobEnv, verifyTransactionHmac } from "@/lib/server/paymob";
import { processTransaction } from "@/lib/server/payments";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { logSecurity } from "@/lib/server/security-log";

export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;

/**
 * Paymob's "transaction processed" callback (server to server). Nothing in the body is trusted until its HMAC-SHA512
 * signature — computed with our secret — matches. Answers 2xx once handled (Paymob stops retrying), 5xx to be retried.
 */
export async function POST(request: Request) {
  const env = paymobEnv();
  if (!env) return new Response("Online payments are not configured.", { status: 503 });
  const ip = ipFrom(request);
  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return new Response("Bad request", { status: 400 });
  let body: { type?: unknown; obj?: unknown } | null = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* handled below */
  }
  if (!body || typeof body !== "object") return new Response("Bad request", { status: 400 });

  // Only "transaction processed" callbacks are handled here (saved-card token callbacks are a different message).
  if (body.type && body.type !== "TRANSACTION") return Response.json({ ok: true, ignored: true });

  const hmac = new URL(request.url).searchParams.get("hmac");
  if (!verifyTransactionHmac(env.hmacSecret, body.obj, hmac)) {
    // Keep the log readable when someone hammers the endpoint: at most 10 entries an hour per address.
    if (await rateLimit(`hmacfail:${ip}`, 10, 3600)) await logSecurity("payment_hmac_failed", "Paymob callback with a wrong or missing signature", ip);
    return new Response("Invalid signature", { status: 401 });
  }
  const txn = fromCallbackObject(body.obj);
  if (!txn) return new Response("Bad transaction", { status: 400 });
  try {
    const result = await processTransaction(txn, "callback");
    return Response.json({ ok: true, outcome: result.outcome });
  } catch (err) {
    console.error("[paymob/callback]", err instanceof Error ? err.message : err);
    return new Response("Could not process the payment yet", { status: 500 });
  }
}
