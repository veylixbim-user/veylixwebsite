import { activate } from "@/lib/server/license-keys";
import { licenseError, licenseOk } from "@/lib/server/license-response";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { readFields } from "@/lib/server/request";

/**
 * Called by the Revit plugin when the user enters a product key.
 * Body (form or JSON): key, deviceId, deviceName, product, nonce. Add ?format=text for a line-based reply.
 */
export async function POST(request: Request) {
  const ip = ipFrom(request);
  if (!(await rateLimit(`activate:${ip}`, 20, 600))) return licenseError(request, "rate_limited");
  const f = await readFields(request);
  if (!f?.key || !f.deviceId) return licenseError(request, "bad_request");
  if (!(await rateLimit(`activate-key:${f.key.toUpperCase().replace(/[^A-Z0-9]/g, "")}`, 10, 3600))) return licenseError(request, "rate_limited");
  try {
    const res = await activate({ key: f.key, deviceId: f.deviceId, deviceName: f.deviceName, product: f.product || null, nonce: f.nonce, ip });
    return res.ok ? licenseOk(request, res.grant) : licenseError(request, res.error);
  } catch (err) {
    console.error("[license/activate]", err);
    return licenseError(request, "unavailable");
  }
}
