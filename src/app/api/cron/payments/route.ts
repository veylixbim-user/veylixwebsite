import { timingSafeEqual } from "node:crypto";
import { reconcilePayments } from "@/lib/server/payments";
import { pruneSecurityEvents } from "@/lib/server/security-log";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // harmless when open: it only re-checks open payments with Paymob
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Daily safety net: asks Paymob about payments whose confirmation never arrived, and tidies old records. */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const result = await reconcilePayments();
    await pruneSecurityEvents();
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[cron/payments]", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
