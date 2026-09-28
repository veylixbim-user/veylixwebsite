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

/** Transactional email from the VEYLIX inbox (see ./mail.ts). Never throws. */
export async function sendEmail(to: string, subject: string, text: string, kind: import("./mail").MailKind = "notification") {
  const { sendMail } = await import("./mail");
  return sendMail({ to, subject, text, kind });
}
