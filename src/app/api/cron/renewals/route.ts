import { timingSafeEqual } from "node:crypto";
import { sendRenewalReminders } from "@/lib/server/reminders";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Without CRON_SECRET the job still only sends reminders that are due, once each, so a stray call is harmless.
  if (!secret) return true;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Daily renewal / trial-ending reminders (scheduled in vercel.json). */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json(await sendRenewalReminders(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[cron/renewals]", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
