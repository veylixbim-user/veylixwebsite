import { badRequest, readJson, sendEmail } from "@/lib/server/http";
import { clean, EMAIL_RE } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return badRequest("invalid_body");
  if (clean(body.website)) return Response.json({ ok: true }); // honeypot

  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const company = clean(body.company, 160);
  const seats = clean(body.seats, 20);
  const message = clean(body.message, 4000);

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "name";
  if (!EMAIL_RE.test(email)) errors.email = "email";
  if (Object.keys(errors).length) return badRequest(errors);

  const inbox = process.env.SALES_INBOX;
  if (inbox) {
    await sendEmail(inbox, `Enterprise enquiry — ${company || name}`, `From: ${name} <${email}>\nCompany: ${company}\nSeats: ${seats}\n\n${message}`).catch(() => undefined);
  }
  return Response.json({ ok: true });
}
