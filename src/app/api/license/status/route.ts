import { licenseStatus } from "@/lib/server/license-keys";
import { licenseError, licenseOk } from "@/lib/server/license-response";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { readFields } from "@/lib/server/request";

/**
 * Online check the plugin makes in the background. It never extends the license; it returns the current
 * signed period so revocations, device resets and interval changes from the admin panel reach the PC.
 */
export async function POST(request: Request) {
  const ip = ipFrom(request);
  if (!(await rateLimit(`status:${ip}`, 120, 600))) return licenseError(request, "rate_limited");
  const f = await readFields(request);
  if (!f?.key || !f.deviceId) return licenseError(request, "bad_request");
  try {
    const res = await licenseStatus({ key: f.key, deviceId: f.deviceId, product: f.product || null, nonce: f.nonce });
    return res.ok ? licenseOk(request, res.grant) : licenseError(request, res.error);
  } catch (err) {
    console.error("[license/status]", err);
    return licenseError(request, "unavailable");
  }
}
