import { badRequest, readJson } from "@/lib/server/http";
import { query } from "@/lib/server/db";
import { notifyInbox } from "@/lib/server/mail";
import { ipFrom, rateLimit } from "@/lib/server/rate-limit";
import { clean, EMAIL_RE } from "@/lib/validation";

const TOPICS = ["support", "sales", "billing", "teams", "other"] as const;

/** Contact / support form: stored in the admin Inbox and forwarded to the VEYLIX Gmail inbox. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return badRequest("invalid_body");
  if (clean(body.website)) return Response.json({ ok: true }); // honeypot
  if (!(await rateLimit(`contact:${ipFrom(request)}`, 5, 3600))) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const company = clean(body.company, 160);
  const seats = clean(body.seats, 20);
  const message = clean(body.message, 4000);
  const topicRaw = clean(body.topic, 20);
  const topic = (TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : company || seats ? "teams" : "support";
  const locale = clean(body.locale, 5) === "ar" ? "ar" : "en";

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "name";
  if (!EMAIL_RE.test(email)) errors.email = "email";
  if (topic !== "teams" && message.length < 5) errors.message = "message";
  if (Object.keys(errors).length) return badRequest(errors);

  try {
    await query("INSERT INTO messages (topic, name, email, company, seats, body, locale) VALUES ($1, $2, $3, $4, $5, $6, $7)", [topic, name, email, company || null, seats || null, message, locale]);
  } catch (err) {
    console.error("[contact]", err);
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
  const label = { support: "Support request", sales: "Sales question", billing: "Billing question", teams: "Team licensing enquiry", other: "Message" }[topic] ?? "Message";
  await notifyInbox(
    `${label} — ${company || name}`,
    `From: ${name} <${email}>${company ? `\nCompany: ${company}` : ""}${seats ? `\nSeats: ${seats}` : ""}\nTopic: ${topic}\n\n${message}\n\n— Reply to this email to answer ${name} directly, or use Admin → Inbox.`,
    email,
  ).catch(() => undefined);
  return Response.json({ ok: true });
}
