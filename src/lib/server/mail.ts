import "server-only";
import { CONTACT_EMAIL } from "@/lib/site";
import { query } from "./db";

/**
 * Outgoing email. Everything is sent from the VEYLIX Gmail inbox (veylixbim@gmail.com) through Gmail SMTP,
 * authenticated with a Gmail App Password in GMAIL_APP_PASSWORD. Replies land in the same inbox.
 * Falls back to Resend (RESEND_API_KEY + a verified EMAIL_FROM domain) when configured instead.
 */

export type MailKind = "manual" | "order" | "trial" | "notification" | "test";
export type MailResult = { sent: boolean; error?: string };

const smtpUser = () => process.env.SMTP_USER || CONTACT_EMAIL;
const smtpPass = () => (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").replace(/\s+/g, "");

export function mailProvider(): "gmail" | "resend" | null {
  if (smtpPass()) return "gmail";
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  return null;
}

/** Header-safe single line (no CR/LF), used for names and subjects. */
const line = (s: string, max = 200) => s.replace(/[\r\n]+/g, " ").trim().slice(0, max);

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded HTML version of a plain-text email. Product keys (VLX-…) are shown in a monospace chip. */
function toHtml(text: string) {
  const body = escapeHtml(text)
    .replace(/\b(VLX(?:-[A-Z0-9]{4}){4})\b/g, '<span style="font-family:ui-monospace,Menlo,Consolas,monospace;background:#0f1a26;color:#3cf2ff;padding:2px 8px;border-radius:6px;letter-spacing:.04em">$1</span>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#00b8d4">$1</a>')
    .replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#f4f6f9;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0b1017">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e3e8ef" cellspacing="0" cellpadding="0">
<tr><td style="padding:18px 24px;border-bottom:1px solid #e3e8ef;font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;letter-spacing:.3em;font-size:14px;color:#0b1017">VEYLIX</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e3e8ef;font-size:12px;color:#6b7686">VEYLIX · Electrical plugins for Revit · <a href="mailto:${CONTACT_EMAIL}" style="color:#6b7686">${CONTACT_EMAIL}</a></td></tr>
</table></td></tr></table></body></html>`;
}

type Transport = { sendMail(msg: Record<string, unknown>): Promise<unknown> };
type GlobalWithMail = typeof globalThis & { __veylixMail?: Transport };

async function gmailTransport(): Promise<Transport> {
  const g = globalThis as GlobalWithMail;
  if (!g.__veylixMail) {
    const nodemailer = await import("nodemailer");
    g.__veylixMail = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: smtpUser(), pass: smtpPass() },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    }) as unknown as Transport;
  }
  return g.__veylixMail;
}

async function log(to: string, subject: string, text: string, kind: MailKind, result: MailResult) {
  await query("INSERT INTO email_log (to_email, subject, body, kind, status, error) VALUES ($1, $2, $3, $4, $5, $6)", [
    to.slice(0, 320),
    subject.slice(0, 300),
    text.slice(0, 20_000),
    kind,
    result.sent ? "sent" : mailProvider() ? "failed" : "not_configured",
    result.error?.slice(0, 500) ?? null,
  ]).catch(() => undefined);
}

export async function sendMail(input: { to: string; subject: string; text: string; replyTo?: string; kind?: MailKind }): Promise<MailResult> {
  const subject = line(input.subject, 250);
  const to = line(input.to, 320);
  const kind = input.kind ?? "manual";
  const provider = mailProvider();
  let result: MailResult;
  try {
    if (provider === "gmail") {
      const transport = await gmailTransport();
      await transport.sendMail({
        from: { name: "VEYLIX", address: smtpUser() },
        to,
        replyTo: input.replyTo ? line(input.replyTo, 320) : CONTACT_EMAIL,
        subject,
        text: input.text,
        html: toHtml(input.text),
      });
      result = { sent: true };
    } else if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to, reply_to: input.replyTo ?? CONTACT_EMAIL, subject, text: input.text, html: toHtml(input.text) }),
      });
      result = res.ok ? { sent: true } : { sent: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    } else {
      result = { sent: false, error: "Email sending is not set up yet. Add GMAIL_APP_PASSWORD in Vercel (see README)." };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mail]", message);
    result = { sent: false, error: /Invalid login|Username and Password not accepted|535/i.test(message) ? "Gmail rejected the login. Check GMAIL_APP_PASSWORD (it must be an App Password, not your normal password)." : message };
  }
  await log(to, subject, input.text, kind, result);
  return result;
}

/** A new website message → the VEYLIX inbox, with Reply-To set to the customer so you can answer from Gmail. */
export async function notifyInbox(subject: string, text: string, replyTo?: string) {
  return sendMail({ to: CONTACT_EMAIL, subject, text, replyTo, kind: "notification" });
}
