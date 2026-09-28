import "server-only";
import type { LicenseError, LicenseGrant } from "./license-keys";

export const LICENSE_MESSAGES: Record<LicenseError | "rate_limited" | "bad_request" | "unavailable", string> = {
  invalid_key: "This product key is not valid. Check it and try again.",
  revoked: "This product key has been disabled. Contact VEYLIX support.",
  expired: "This product key has expired. Renew your license to continue.",
  wrong_product: "This key is for a different VEYLIX product.",
  device_mismatch: "This key is already activated on another PC. Contact support to move it.",
  not_activated: "This key has not been activated on this PC yet.",
  trial_used: "A free trial was already used on this PC. Please buy a product key.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
  bad_request: "Invalid request.",
  unavailable: "The license server is temporarily unavailable. Please try again later.",
};

const STATUS: Record<string, number> = { invalid_key: 404, revoked: 403, expired: 403, wrong_product: 403, device_mismatch: 409, not_activated: 409, trial_used: 403, rate_limited: 429, bad_request: 400, unavailable: 503 };

function wantsText(request: Request) {
  return new URL(request.url).searchParams.get("format") === "text";
}

const noStore = { "Cache-Control": "no-store" };

export function licenseOk(request: Request, grant: LicenseGrant) {
  if (wantsText(request)) {
    return new Response(["OK", grant.payload, grant.signature, ""].join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", ...noStore } });
  }
  return Response.json(
    {
      ok: true,
      payload: grant.payload,
      signature: grant.signature,
      validUntil: grant.validUntil.toISOString(),
      expiresAt: grant.expiresAt?.toISOString() ?? null,
      checkIntervalDays: grant.checkIntervalDays,
      scope: grant.scope,
    },
    { headers: noStore },
  );
}

export function licenseError(request: Request, code: keyof typeof LICENSE_MESSAGES) {
  const message = LICENSE_MESSAGES[code];
  const status = STATUS[code] ?? 400;
  if (wantsText(request)) {
    return new Response(["ERROR", code, message, ""].join("\n"), { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...noStore } });
  }
  return Response.json({ ok: false, error: code, message }, { status, headers: noStore });
}
