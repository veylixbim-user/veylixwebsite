import "server-only";
import { CONTACT_EMAIL, siteUrl } from "@/lib/site";
import { query } from "./db";
import { sendMail } from "./mail";
import { getSettings } from "./settings";

const DAY_MS = 86_400_000;

type Row = {
  id: number;
  key: string;
  assigned_to: string;
  expires_at: Date;
  trial: boolean;
  reminder_stage: number;
  reminder_for: Date | null;
  product_name: string | null;
  product_slug: string | null;
};

/** Stage reached for a key ending in `daysLeft` days: 1 = 7 days, 2 = 3 days, 3 = 1 day, 4 = ended (grace). */
export function reminderStage(daysLeft: number, trial: boolean): number {
  if (daysLeft < 0) return 4;
  if (daysLeft <= 1) return 3;
  if (daysLeft <= 3) return 2;
  if (daysLeft <= 7 && !trial) return 1;
  return 0;
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);

function message(r: Row, stage: number, graceDays: number) {
  const product = r.product_name ?? "VEYLIX";
  const end = new Date(r.expires_at);
  const link = r.product_slug ? `${siteUrl}/en/products/${r.product_slug}` : `${siteUrl}/en/pricing`;
  const linkAr = r.product_slug ? `${siteUrl}/ar/products/${r.product_slug}` : `${siteUrl}/ar/pricing`;
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY_MS));
  const graceEnd = new Date(end.getTime() + graceDays * DAY_MS);

  if (r.trial) {
    const subject = stage === 4 ? `Your ${product} trial has ended` : `Your ${product} trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    const text = `${stage === 4 ? `Your free trial of ${product} has ended.` : `Your free trial of ${product} ends on ${fmt(end)}.`}

To keep using it, buy a license: ${link}
Tip: at checkout, tick "Renewing an existing license?" and enter your trial key ${r.key} to keep the same key.

—

${stage === 4 ? `انتهت الفترة التجريبية المجانية لـ ${product}.` : `تنتهي الفترة التجريبية المجانية لـ ${product} في ${fmt(end)}.`}
لمواصلة الاستخدام اشترِ ترخيصًا: ${linkAr}
عند الدفع فعّل "تجدّد ترخيصًا حاليًا؟" وأدخل مفتاح التجربة ${r.key} للاحتفاظ بنفس المفتاح.

Questions? Reply to this email or write to ${CONTACT_EMAIL}.`;
    return { subject, text };
  }

  const subject =
    stage === 4
      ? `Your ${product} license has ended — renew by ${fmt(graceEnd)}`
      : `Your ${product} license ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const text = `${
    stage === 4
      ? `Your ${product} license ended on ${fmt(end)}. It keeps working until ${fmt(graceEnd)} so you have time to renew.`
      : `Your ${product} license (key ${r.key}) ends on ${fmt(end)}.`
  }

How to renew (takes a minute):
1. Open ${link} and add the plugin to your cart (monthly or yearly).
2. At checkout, tick "Renewing an existing license?" and enter your key: ${r.key}
3. Pay by InstaPay and enter the transfer reference.

Your key stays the same and keeps working on the same PC. Renewing early doesn't lose any days: the new period starts when the current one ends.

—

${stage === 4 ? `انتهى ترخيص ${product} في ${fmt(end)}، ويظل يعمل حتى ${fmt(graceEnd)} لتتمكن من التجديد.` : `ينتهي ترخيص ${product} (المفتاح ${r.key}) في ${fmt(end)}.`}
للتجديد: افتح ${linkAr} وأضف الإضافة للسلة، ثم فعّل "تجدّد ترخيصًا حاليًا؟" وأدخل مفتاحك ${r.key}، وادفع عبر InstaPay.
يبقى مفتاحك كما هو ويعمل على نفس الجهاز، والتجديد المبكر لا يُضيّع أي أيام.

Questions? Reply to this email or write to ${CONTACT_EMAIL}.`;
  return { subject, text };
}

/**
 * Daily job (Vercel Cron → /api/cron/renewals). Emails each key owner once per stage, never repeats a
 * stage for the same end date, and stays quiet when a renewal payment is already waiting for approval.
 */
export async function sendRenewalReminders(limit = 200) {
  const { renewalGraceDays } = await getSettings();
  const rows = await query<Row>(
    `SELECT k.id, k.key, k.assigned_to, k.expires_at, k.trial, k.reminder_stage, k.reminder_for, p.name AS product_name, p.slug AS product_slug
     FROM license_keys k LEFT JOIN products p ON p.id = k.product_id
     WHERE NOT k.revoked AND k.assigned_to LIKE '%@%' AND k.expires_at IS NOT NULL
       AND k.expires_at > now() - make_interval(days => $1) AND k.expires_at < now() + interval '8 days'
       AND (k.trial = false OR k.device_id IS NOT NULL)
       AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.status = 'pending' AND o.renew_key = k.key)
     ORDER BY k.expires_at LIMIT $2`,
    [Math.max(1, renewalGraceDays), limit],
  );

  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    const end = new Date(r.expires_at);
    const stage = reminderStage((end.getTime() - Date.now()) / DAY_MS, r.trial);
    if (stage === 4 && !r.trial && renewalGraceDays === 0) continue;
    const already = r.reminder_for && new Date(r.reminder_for).getTime() === end.getTime() ? r.reminder_stage : 0;
    if (stage <= already) continue;
    const { subject, text } = message(r, stage, renewalGraceDays);
    const res = await sendMail({ to: r.assigned_to, subject, text, kind: "notification" });
    if (res.sent) {
      sent++;
      await query("UPDATE license_keys SET reminder_stage = $2, reminder_for = $3 WHERE id = $1", [r.id, stage, end]);
    } else {
      failed++;
      if (/not set up/i.test(res.error ?? "")) break; // email isn't configured — nothing will send
    }
  }
  return { checked: rows.length, sent, failed };
}
