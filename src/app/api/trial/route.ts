import { issueTrialKey } from "@/lib/server/license-keys";
import { getProductBySlug } from "@/lib/server/products";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { readFields } from "@/lib/server/request";
import { getSettings } from "@/lib/server/settings";
import { sendEmail } from "@/lib/server/http";
import { clean, EMAIL_RE } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = ipFrom(request);
  if (!(await rateLimit(`trial:${ip}`, 5, 3600))) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const f = await readFields(request);
  if (!f) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  if (clean(f.website)) return Response.json({ ok: true }); // honeypot
  const settings = await getSettings();
  if (!settings.trialsEnabled) return Response.json({ ok: false, error: "disabled" }, { status: 403 });

  const name = clean(f.name, 120);
  const email = clean(f.email, 160).toLowerCase();
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "name";
  if (!EMAIL_RE.test(email)) errors.email = "email";
  const product = await getProductBySlug(clean(f.product, 64));
  if (!product || !product.published) errors.product = "product";
  if (Object.keys(errors).length || !product) return Response.json({ ok: false, errors }, { status: 400 });

  const { key } = await issueTrialKey({ email, name, productId: product.id });
  const mail = await sendEmail(email, `Your ${product.name} free trial key`, `Hi ${name},\n\nYour ${settings.trialDays}-day trial key for ${product.name}:\n\n${key}\n\nThe trial starts when you first enter the key inside Revit.\n\n— VEYLIX`, "trial").catch(() => ({ sent: false }));
  return Response.json({ ok: true, key, trialDays: settings.trialDays, hasFile: Boolean(product.fileUrl), emailed: mail.sent }, { headers: { "Cache-Control": "no-store" } });
}
