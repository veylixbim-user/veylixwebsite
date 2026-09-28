import { badRequest, readJson } from "@/lib/server/http";
import { query } from "@/lib/server/db";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { clean, EMAIL_RE } from "@/lib/validation";

/** Stores the address for Admin → Customers (and adds it to a Resend audience when one is configured). */
export async function POST(request: Request) {
  const body = await readJson(request);
  const email = clean(body?.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return badRequest({ email: "email" });
  if (!(await rateLimit(`newsletter:${ipFrom(request)}`, 10, 3600))) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const locale = clean(body?.locale, 5) === "ar" ? "ar" : "en";

  try {
    await query("INSERT INTO subscribers (email, locale) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING", [email, locale]);
  } catch (err) {
    console.error("[newsletter]", err);
    return Response.json({ ok: false }, { status: 503 });
  }

  const key = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_ID;
  if (key && audience) {
    await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, unsubscribed: false }),
    }).catch(() => null);
  }
  return Response.json({ ok: true });
}
