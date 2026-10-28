import "server-only";
import { logSecurity } from "./security-log";
import { ipFrom } from "./rate-limit";

/**
 * Cross-site request guard for browser-facing POST endpoints. A page on another site can make a visitor's browser
 * send a request here; browsers label such requests (Sec-Fetch-Site / Origin), so we refuse them.
 * Non-browser clients (the Revit plugin, curl, Paymob's servers) send neither header and are not affected —
 * those endpoints don't rely on cookies, and are protected by keys / signatures instead.
 */
export function sameOriginRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.get("origin");
  if (origin && origin !== "null") {
    try {
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  if (origin === "null") return false;
  return true;
}

/** Returns a 403 response when the request came from another site, otherwise null. */
export async function rejectCrossSite(request: Request, label: string): Promise<Response | null> {
  if (sameOriginRequest(request)) return null;
  await logSecurity("origin_blocked", `${label} from ${request.headers.get("origin") ?? request.headers.get("sec-fetch-site")}`, ipFrom(request));
  return Response.json({ ok: false, errors: { form: "forbidden" } }, { status: 403 });
}
