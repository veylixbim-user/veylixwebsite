import { badRequest, readJson } from "@/lib/server/http";
import { clean, EMAIL_RE } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = clean(body?.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return badRequest({ email: "email" });

  const key = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_ID;
  if (key && audience) {
    const res = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, unsubscribed: false }),
    }).catch(() => null);
    if (!res?.ok) return Response.json({ ok: false }, { status: 502 });
  }
  return Response.json({ ok: true });
}
