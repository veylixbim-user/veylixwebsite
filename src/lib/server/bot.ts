import "server-only";
import { ipFrom } from "./rate-limit";
import { logSecurity } from "./security-log";

/**
 * Cheap, invisible checks that stop most form spam without a CAPTCHA:
 *  - a hidden "website" field that only scripts fill in,
 *  - a form that is submitted less than a second after it appeared.
 * (Requests from non-browser clients don't send `elapsed` and are only checked for the hidden field.)
 * A Cloudflare Turnstile check can be layered on top — see ./turnstile.ts.
 */
export function looksLikeBot(fields: Record<string, unknown>): boolean {
  const trap = fields.website;
  if (typeof trap === "string" && trap.trim() !== "") return true;
  const elapsed = Number(fields.elapsed);
  if (fields.elapsed !== undefined && Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 1000) return true;
  return false;
}

/** Returns a 400 response for a suspected bot (and notes it), otherwise null. */
export async function rejectBot(request: Request, fields: Record<string, unknown>, label: string): Promise<Response | null> {
  if (!looksLikeBot(fields)) return null;
  await logSecurity("bot_blocked", label, ipFrom(request));
  return Response.json({ ok: false, errors: { form: "bot" } }, { status: 400 });
}
