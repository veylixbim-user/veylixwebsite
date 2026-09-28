import "server-only";

const MAX_BODY = 16 * 1024;

/** Parse a small JSON body; returns null on anything unexpected. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return null;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return null;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return null;
    const data = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function badRequest(errors: Record<string, string> | string) {
  return Response.json({ ok: false, errors: typeof errors === "string" ? { form: errors } : errors }, { status: 400 });
}

/** Optional transactional email via Resend's REST API. No-op when RESEND_API_KEY is unset. */
export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false as const };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "VEYLIX <hello@veylix.com>", to, subject, text }),
  });
  return { sent: res.ok };
}
