import { badRequest, readJson, sendEmail } from "@/lib/server/http";
import { licenseKey } from "@/lib/server/ids";
import { clean, EMAIL_RE } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return badRequest("invalid_body");
  if (clean(body.website)) return Response.json({ ok: true }); // honeypot

  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "name";
  if (!EMAIL_RE.test(email)) errors.email = "email";
  if (Object.keys(errors).length) return badRequest(errors);

  const key = licenseKey("TRL");
  await sendEmail(email, "Your VEYLIX 14-day trial", `Hi ${name},\n\nYour trial key: ${key}\nDownload: https://veylix.com/download\n\n— VEYLIX`).catch(() => undefined);

  return Response.json({ ok: true, key });
}
