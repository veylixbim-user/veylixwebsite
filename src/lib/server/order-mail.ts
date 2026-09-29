import "server-only";
import { siteUrl } from "@/lib/site";
import { sendEmail } from "./http";
import { notifyInbox } from "./mail";
import type { Order } from "./orders";

const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** The "you're licensed" email: English first, Arabic below. Sent whether the order was paid online or approved by hand. */
export async function sendOrderPaidEmail(order: Order, how: "online" | "transfer") {
  const link = (loc: string) => `${siteUrl}/${loc}/order/${order.id}?t=${order.accessToken}`;
  const keysEn = order.licenseKeys
    .map((k) => `${k.productName}: ${k.key}${k.renewed ? " (renewed)" : ""}${k.expiresAt ? ` — valid until ${dateOnly(k.expiresAt)}` : ""}`)
    .join("\n");
  const keysAr = order.licenseKeys
    .map((k) => `${k.productName}: ${k.key}${k.renewed ? " (تم التجديد)" : ""}${k.expiresAt ? ` — صالح حتى ${dateOnly(k.expiresAt)}` : ""}`)
    .join("\n");
  const paidLine = how === "online" ? "We received your online payment — thank you!" : "We received your InstaPay payment — thank you!";
  const paidLineAr = how === "online" ? "استلمنا دفعتك عبر الإنترنت — شكرًا لك!" : "استلمنا دفعتك عبر إنستاباي — شكرًا لك!";
  const text = `Hi ${order.customer.name},

${paidLine} Your product keys:

${keysEn}

How to start:
1. Download the plugin: ${siteUrl}/en/download (enter your key)
2. Install it and open Revit.
3. Enter the same key when the plugin asks — it is locked to that PC.

Order & tax invoice: ${link("en")}

—

مرحبًا ${order.customer.name}،

${paidLineAr} مفاتيح المنتج الخاصة بك:

${keysAr}

للبدء:
1. حمّل الإضافة: ${siteUrl}/ar/download (أدخل مفتاحك)
2. ثبّتها ثم افتح Revit.
3. أدخل نفس المفتاح عندما تطلبه الإضافة — يرتبط بهذا الجهاز.

الطلب والفاتورة الضريبية: ${link("ar")}

Questions? Just reply to this email. / أي استفسار؟ ردّ على هذه الرسالة مباشرةً.

— VEYLIX`;
  return sendEmail(order.customer.email, `Your VEYLIX license — ${order.id} / ترخيص VEYLIX الخاص بك`, text, "order");
}

/** Tells the owner about a payment event that needs attention (or just good news). */
export async function alertOwner(subject: string, body: string) {
  return notifyInbox(subject, `${body}\n\n${siteUrl}/admin/orders`).catch(() => undefined);
}
