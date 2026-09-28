import { authorizeDownload, logActivity } from "@/lib/server/license-keys";
import { LICENSE_MESSAGES } from "@/lib/server/license-response";
import { getProductBySlug } from "@/lib/server/products";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { readFields } from "@/lib/server/request";

/** Website download gate: returns the installer URL only for a valid product key. */
export async function POST(request: Request) {
  const ip = ipFrom(request);
  if (!(await rateLimit(`download:${ip}`, 20, 600))) return Response.json({ ok: false, error: "rate_limited", message: LICENSE_MESSAGES.rate_limited }, { status: 429 });
  const f = await readFields(request);
  if (!f?.key || !f.product) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  const product = await getProductBySlug(f.product);
  if (!product || !product.published || !product.fileUrl) return Response.json({ ok: false, error: "not_found", message: "This download is not available yet." }, { status: 404 });
  const res = await authorizeDownload(f.key, product.id);
  if (!res.ok) return Response.json({ ok: false, error: res.error, message: LICENSE_MESSAGES[res.error] }, { status: 403 });
  await logActivity("download", { keyId: res.key.id, productId: product.id, ip });
  return Response.json({ ok: true, url: product.fileUrl, fileName: product.fileName }, { headers: { "Cache-Control": "no-store" } });
}
