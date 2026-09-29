"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin, changePassword, login, logout } from "@/lib/server/auth";
import { deleteStoredFile } from "@/lib/server/storage";
import { productId as newProductId } from "@/lib/server/ids";
import {
  deleteProduct,
  getProductById,
  insertProduct,
  slugTaken,
  updateProduct,
  type ProductImage,
  type ProductInput,
} from "@/lib/server/products";
import { generateKeys, logActivity, updateKey, type KeyUpdate } from "@/lib/server/license-keys";
import { approveOrder, createOrder, getOrder, rejectOrder } from "@/lib/server/orders";
import { getKey } from "@/lib/server/license-keys";
import { getSettings, setSetting } from "@/lib/server/settings";
import { sendEmail } from "@/lib/server/http";
import { sendOrderPaidEmail } from "@/lib/server/order-mail";
import { createIntention, paymobEnv, parseIntegrationIds } from "@/lib/server/paymob";
import { recheckOrderPayments } from "@/lib/server/payments";
import { EG_MOBILE_RE, EMAIL_RE, normalizePhone } from "@/lib/validation";
import { isArtId, type ArtId } from "@/lib/art";
import { siteUrl } from "@/lib/site";

export type ActionState = { ok?: boolean; error?: string; message?: string; keys?: string[]; needCode?: boolean; link?: string } | undefined;

const str = (fd: FormData, k: string, max = 5000) => String(fd.get(k) ?? "").trim().slice(0, max);
const intOrNull = (v: string) => {
  if (!v) return null;
  const n = Math.round(Number(v.replace(/[,\s]/g, "")));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function refreshSite() {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/sitemap.xml");
}

/* ----------------------------- auth ----------------------------- */

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await login(str(fd, "password", 200), str(fd, "code", 20));
  if (!res.ok) return { error: res.error, needCode: res.needCode };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const next = str(fd, "next", 200);
  if (next !== str(fd, "confirm", 200)) return { error: "The new passwords don't match." };
  const res = await changePassword(str(fd, "current", 200), next);
  if (!res.ok) return { error: res.error };
  await logout();
  redirect("/admin/login");
}

/* --------------------------- products --------------------------- */

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export async function saveProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const id = str(fd, "id", 40);
  const name = str(fd, "name", 120);
  const slug = str(fd, "slug", 64).toLowerCase();
  if (name.length < 2) return { error: "Enter a product name." };
  if (!SLUG_RE.test(slug)) return { error: "The URL name may use lowercase letters, numbers and dashes only." };
  if (await slugTaken(slug, id || undefined)) return { error: "Another product already uses this URL name." };

  let images: ProductImage[] = [];
  try {
    images = (JSON.parse(str(fd, "images", 20000) || "[]") as ProductImage[]).filter((i) => typeof i?.url === "string").slice(0, 12);
  } catch {
    return { error: "Image list is invalid." };
  }

  const input: ProductInput = {
    slug,
    name,
    taglineEn: str(fd, "taglineEn", 300),
    taglineAr: str(fd, "taglineAr", 300),
    descriptionEn: str(fd, "descriptionEn", 8000),
    descriptionAr: str(fd, "descriptionAr", 8000),
    featuresEn: str(fd, "featuresEn", 4000),
    featuresAr: str(fd, "featuresAr", 4000),
    version: str(fd, "version", 40),
    revitVersions: str(fd, "revitVersions", 80),
    priceMonthly: intOrNull(str(fd, "priceMonthly", 20)),
    priceYearly: intOrNull(str(fd, "priceYearly", 20)),
    images,
    fileUrl: str(fd, "fileUrl", 2000) || null,
    fileName: str(fd, "fileName", 200) || null,
    fileSize: intOrNull(str(fd, "fileSize", 20)),
    art: isArtId(str(fd, "art", 20)) ? (str(fd, "art", 20) as ArtId) : null,
    published: fd.get("published") === "on",
    sortOrder: intOrNull(str(fd, "sortOrder", 10)) ?? 0,
  };

  if (id) {
    const before = await getProductById(id);
    if (!before) return { error: "Product not found." };
    await updateProduct(id, input);
    // Clean up files that were replaced or removed.
    if (before.fileUrl && before.fileUrl !== input.fileUrl) await deleteStoredFile(before.fileUrl);
    for (const img of before.images) if (!input.images.some((i) => i.url === img.url)) await deleteStoredFile(img.url);
    refreshSite();
    return { ok: true, message: "Saved." };
  }
  const newId = newProductId();
  await insertProduct(newId, input);
  refreshSite();
  redirect(`/admin/products/${newId}?created=1`);
}

export async function deleteProductAction(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id", 40);
  const product = await getProductById(id);
  if (product) {
    // Keys bound to a deleted product must not silently become "all products" keys.
    const { query } = await import("@/lib/server/db");
    await query("UPDATE license_keys SET revoked = true, note = trim(coalesce(note, '') || ' (product deleted: ' || $2 || ')') WHERE product_id = $1", [id, product.name]);
    await deleteProduct(id);
    await deleteStoredFile(product.fileUrl);
    for (const img of product.images) await deleteStoredFile(img.url);
  }
  refreshSite();
  redirect("/admin/products");
}

/* ----------------------------- keys ----------------------------- */

export async function generateKeysAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const count = intOrNull(str(fd, "count", 10)) ?? 0;
  if (count < 1 || count > 5000) return { error: "Generate between 1 and 5,000 keys at a time." };
  const productId = str(fd, "productId", 40) || null;
  const expires = str(fd, "expiresAt", 20);
  const days = intOrNull(str(fd, "activationDays", 6));
  const trial = fd.get("trial") === "on";
  const keys = await generateKeys(count, {
    productId,
    note: str(fd, "note", 200) || null,
    expiresAt: expires ? new Date(`${expires}T23:59:59Z`) : null,
    activationDays: days && days > 0 ? days : null,
  });
  if (trial && keys.length) {
    const { query } = await import("@/lib/server/db");
    await query("UPDATE license_keys SET trial = true WHERE key = ANY($1::text[])", [keys]);
  }
  await logActivity("generate", { productId, detail: `${keys.length} keys` });
  revalidatePath("/admin/keys");
  return { ok: true, message: `${keys.length} keys generated.`, keys };
}

export async function keyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const id = Number(str(fd, "id", 12));
  const action = str(fd, "action", 30);
  if (!id) return { error: "Missing key." };
  if (action === "renew") {
    const { renewKeyById } = await import("@/lib/server/license-keys");
    const res = await renewKeyById(id, str(fd, "period", 10) === "yearly" ? "yearly" : "monthly");
    if (!res.ok) return { error: res.error };
    const until = res.newEnd.toISOString().slice(0, 10);
    await logActivity("key:renew", { keyId: id, detail: `until ${until}` });
    if (fd.get("notify") === "on" && res.key.assignedTo?.includes("@")) {
      const product = res.key.productName ?? "VEYLIX";
      await sendEmail(
        res.key.assignedTo,
        `Your ${product} license is renewed until ${until}`,
        `Hi,\n\nYour ${product} license (key ${res.key.key}) has been renewed. It is now valid until ${until}.\n\nNothing to reinstall: the plugin picks up the new date at its next online check, or right away if you enter your key again.\n\nThank you!\n— VEYLIX\n\n—\n\nتم تجديد ترخيص ${product} (المفتاح ${res.key.key}) حتى ${until}. لا حاجة لإعادة التثبيت.`,
        "order",
      ).catch(() => undefined);
    }
    revalidatePath("/admin/keys");
    return { ok: true, message: `Renewed until ${until}.` };
  }
  let update: KeyUpdate;
  switch (action) {
    case "revoke":
    case "restore":
    case "reset-device":
    case "force-recheck":
    case "delete":
      update = { action };
      break;
    case "set-expiry": {
      const v = str(fd, "expiresAt", 20);
      update = { action, expiresAt: v ? new Date(`${v}T23:59:59Z`) : null };
      break;
    }
    case "set-days": {
      const n = intOrNull(str(fd, "days", 6));
      update = { action, days: n && n > 0 ? n : null };
      break;
    }
    case "assign":
      update = { action, assignedTo: str(fd, "assignedTo", 200) || null, note: str(fd, "note", 500) || null };
      break;
    case "set-product":
      update = { action, productId: str(fd, "productId", 40) || null };
      break;
    default:
      return { error: "Unknown action." };
  }
  await updateKey(id, update);
  await logActivity(`key:${action}`, { keyId: id });
  revalidatePath("/admin/keys");
  return { ok: true, message: "Updated." };
}

/* ---------------------------- orders ---------------------------- */

export async function approveOrderAction(fd: FormData) {
  await assertAdmin();
  const order = await approveOrder(str(fd, "id", 40));
  if (order?.status === "paid") await sendOrderPaidEmail(order, order.method === "paymob" ? "online" : "transfer").catch(() => undefined);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/** Asks Paymob whether a customer's open online payment went through (when its callback never arrived). */
export async function recheckPaymentAction(fd: FormData) {
  await assertAdmin();
  await recheckOrderPayments(str(fd, "id", 40), true).catch(() => undefined);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
}

/**
 * "New payment link": the owner enters a sale (customer, plugin, period) and gets a link the customer opens to pay by
 * card, wallet, Fawry or InstaPay. Keys are issued automatically when the payment is confirmed. Also renews a license.
 */
export async function createPaymentLinkAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const name = str(fd, "name", 120);
  const email = str(fd, "email", 160).toLowerCase();
  const phone = normalizePhone(str(fd, "phone", 30));
  const productId = str(fd, "productId", 40);
  const billing = str(fd, "billing", 10) === "yearly" ? "yearly" : "monthly";
  const quantity = Math.min(50, Math.max(1, Math.floor(Number(str(fd, "quantity", 3))) || 1));
  const renewKey = str(fd, "renewKey", 40) || null;
  const language = str(fd, "locale", 2) === "ar" ? "ar" : "en";
  if (name.length < 2) return { error: "Enter the customer's name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (!EG_MOBILE_RE.test(phone)) return { error: "Enter a valid Egyptian mobile number (needed by the payment page)." };
  if (!productId) return { error: "Choose a plugin." };
  if (renewKey) {
    const key = await getKey(renewKey);
    if (!key || key.revoked) return { error: "That key was not found (or is revoked)." };
    if (!key.expiresAt) return { error: "That key never expires, so it doesn't need renewing." };
    if (quantity !== 1) return { error: "Renew one license at a time." };
    if (key.productId && key.productId !== productId) return { error: "That key belongs to a different plugin." };
  }
  const order = await createOrder({ lines: [{ productId, billing, quantity }], customer: { name, email, phone }, business: null, method: "paymob", paymentRef: "", renewKey, locale: language });
  if (!order) return { error: "That plugin has no price for the chosen period. Set a price in Products first." };
  const link = `${siteUrl}/${language}/order/${order.id}?t=${order.accessToken}`;
  if (fd.get("notify") === "on") {
    const total = order.total.toLocaleString("en-US", { minimumFractionDigits: 2 });
    await sendEmail(
      email,
      `Your VEYLIX payment link — ${order.id} / رابط الدفع الخاص بك`,
      `Hi ${name},\n\nHere is your secure payment link for EGP ${total}:\n${link}\n\nYou can pay by card (Visa / Mastercard / Meeza), mobile wallet, Fawry or InstaPay. Your product key is emailed automatically as soon as the payment is confirmed.\n\n—\n\nمرحبًا ${name}،\n\nهذا رابط الدفع الآمن الخاص بك بمبلغ ${total} جنيه:\n${link}\n\nيمكنك الدفع بالبطاقة (فيزا / ماستركارد / ميزة) أو المحفظة الإلكترونية أو فوري أو إنستاباي. سيصلك مفتاح المنتج تلقائيًا بمجرد تأكيد الدفع.\n\n— VEYLIX`,
      "order",
    ).catch(() => undefined);
  }
  await logActivity("payment-link", { detail: `${order.id} for ${email}` });
  revalidatePath("/admin/orders");
  return { ok: true, link, message: `Payment link created for ${name} — EGP ${order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}.` };
}

export async function rejectOrderAction(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id", 40);
  const note = str(fd, "note", 500) || null;
  await rejectOrder(id, note);
  const order = await getOrder(id);
  if (order?.status === "rejected" && fd.get("notify") === "on") {
    const online = order.method === "paymob";
    await sendEmail(
      order.customer.email,
      `About your VEYLIX order ${order.id}`,
      online
        ? `Hi ${order.customer.name},\n\nYour VEYLIX order ${order.id} was cancelled.${note ? `\n\nNote: ${note}` : ""}\n\nIf you were charged, reply to this email and we will refund you quickly.\n\n— VEYLIX`
        : `Hi ${order.customer.name},\n\nWe could not match your InstaPay transfer (reference ${order.paymentRef}) for order ${order.id}.${note ? `\n\nNote: ${note}` : ""}\n\nIf you already paid, reply to this email with a screenshot of the transfer and we will sort it out quickly.\n\n— VEYLIX`,
      "order",
    ).catch(() => undefined);
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/* --------------------------- settings --------------------------- */

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const days = intOrNull(str(fd, "activationDays", 6));
  const trialDays = intOrNull(str(fd, "trialDays", 6));
  const grace = intOrNull(str(fd, "renewalGraceDays", 3));
  const vat = intOrNull(str(fd, "vatRate", 3));
  const instapay = str(fd, "instapayNumber", 40);
  const instapayLink = str(fd, "instapayLink", 300);
  if (instapayLink) {
    try {
      const u = new URL(instapayLink);
      if (u.protocol !== "https:") throw new Error("not https");
    } catch {
      return { error: "The InstaPay payment link must be a full https:// address (for example https://ipn.eg/S/yourname/instapay/abc123)." };
    }
  }
  const ids = (k: string) => {
    const raw = str(fd, k, 120);
    if (raw && parseIntegrationIds(raw).length === 0) return null;
    return parseIntegrationIds(raw).join(", ");
  };
  const idCard = ids("paymobCard");
  const idWallet = ids("paymobWallet");
  const idInstapay = ids("paymobInstapay");
  const idKiosk = ids("paymobKiosk");
  const idInstallments = ids("paymobInstallments");
  if ([idCard, idWallet, idInstapay, idKiosk, idInstallments].includes(null)) return { error: "Paymob integration IDs are numbers (for example 4569876). Separate several with commas." };
  if (!days || days < 1 || days > 3650) return { error: "License check interval must be between 1 and 3650 days." };
  if (!trialDays || trialDays < 1 || trialDays > 365) return { error: "Trial length must be between 1 and 365 days." };
  if (grace === null || grace > 30) return { error: "Renewal grace must be between 0 and 30 days." };
  if (vat === null || vat > 100) return { error: "VAT must be between 0 and 100%." };
  if (!/^[0-9+ ]{6,20}$/.test(instapay) && !/^[\w.-]+@instapay$/i.test(instapay)) return { error: "Enter a valid InstaPay number or address." };
  await setSetting("activation_days", String(days));
  await setSetting("trial_days", String(trialDays));
  await setSetting("renewal_grace_days", String(grace));
  await setSetting("trials_enabled", fd.get("trialsEnabled") === "on" ? "1" : "0");
  await setSetting("vat_rate", String(vat));
  await setSetting("instapay_number", instapay);
  await setSetting("instapay_name", str(fd, "instapayName", 80));
  await setSetting("instapay_link", instapayLink);
  await setSetting("manual_payments_enabled", fd.get("manualPaymentsEnabled") === "on" ? "1" : "0");
  await setSetting("online_payments_enabled", fd.get("onlinePaymentsEnabled") === "on" ? "1" : "0");
  await setSetting("paymob_card_id", idCard ?? "");
  await setSetting("paymob_wallet_id", idWallet ?? "");
  await setSetting("paymob_instapay_id", idInstapay ?? "");
  await setSetting("paymob_kiosk_id", idKiosk ?? "");
  await setSetting("paymob_installments_ids", idInstallments ?? "");
  refreshSite();
  revalidatePath("/admin/settings");
  return { ok: true, message: "Settings saved. Plugins pick up the new check interval at their next online check." };
}

/** Creates a real (unpaid) Paymob payment request for EGP 10 to prove the keys, region and integration IDs work. */
export async function testPaymobAction(): Promise<ActionState> {
  await assertAdmin();
  const env = paymobEnv();
  if (!env) return { error: "Paymob keys are not set. Add PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY and PAYMOB_HMAC_SECRET in your hosting environment variables, then redeploy." };
  const settings = await getSettings();
  const ids = parseIntegrationIds(settings.paymob.card, settings.paymob.wallet, settings.paymob.instapay, settings.paymob.kiosk, settings.paymob.installments);
  if (ids.length === 0) return { error: "Save at least one Paymob integration ID first (for example the card one)." };
  try {
    const intention = await createIntention(env, {
      amountCents: 1000,
      specialReference: `TEST-${Date.now().toString(36).toUpperCase()}`,
      integrationIds: ids.slice(0, 1),
      items: [{ name: "VEYLIX connection test", amountCents: 1000, quantity: 1 }],
      customer: { name: "VEYLIX Test", email: "veylixbim@gmail.com", phone: "01000000000" },
      notificationUrl: `${siteUrl}/api/paymob/callback`,
      redirectionUrl: `${siteUrl}/en`,
      expiresInSeconds: 600,
    });
    return { ok: true, link: intention.checkoutUrl, message: `Paymob accepted the keys (${env.testMode ? "TEST mode" : "LIVE mode"}). Nothing was charged.` };
  } catch (err) {
    return { error: `Paymob refused the request: ${err instanceof Error ? err.message.slice(0, 300) : "unknown error"}` };
  }
}

/* ----------------------------- email ---------------------------- */

const EMAIL_ONLY_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z]{2,}$/i;

export type EmailActionState = { ok?: boolean; error?: string; message?: string; fallback?: string } | undefined;

function gmailCompose(to: string, subject: string, body: string) {
  const u = new URL("https://mail.google.com/mail/");
  u.searchParams.set("view", "cm");
  u.searchParams.set("fs", "1");
  u.searchParams.set("to", to);
  u.searchParams.set("su", subject);
  u.searchParams.set("body", body.slice(0, 1800));
  return u.toString();
}

/** Admin → customer email, sent from the VEYLIX Gmail inbox. */
export async function sendEmailAction(_: EmailActionState, fd: FormData): Promise<EmailActionState> {
  await assertAdmin();
  const to = str(fd, "to", 320).toLowerCase();
  const subject = str(fd, "subject", 200);
  const body = str(fd, "body", 20000);
  if (!EMAIL_ONLY_RE.test(to)) return { error: "Enter one valid email address." };
  if (subject.length < 2) return { error: "Add a subject." };
  if (body.length < 2) return { error: "Write a message." };
  const { sendMail } = await import("@/lib/server/mail");
  const res = await sendMail({ to, subject, text: body, kind: "manual" });
  if (!res.sent) return { error: res.error ?? "The email could not be sent.", fallback: gmailCompose(to, subject, body) };
  const replyTo = intOrNull(str(fd, "messageId", 12));
  if (replyTo) {
    const { setMessageHandled } = await import("@/lib/server/customers");
    await setMessageHandled(replyTo, true);
  }
  revalidatePath("/admin/inbox");
  revalidatePath("/admin/customers");
  return { ok: true, message: `Sent to ${to}.` };
}

export async function messageAction(fd: FormData) {
  await assertAdmin();
  const id = intOrNull(str(fd, "id", 12));
  if (!id) return;
  const { deleteMessage, setMessageHandled } = await import("@/lib/server/customers");
  const action = str(fd, "action", 20);
  if (action === "delete") await deleteMessage(id);
  else await setMessageHandled(id, action === "done");
  revalidatePath("/admin/inbox");
  revalidatePath("/admin", "layout");
}

export async function sendTestEmailAction(): Promise<EmailActionState> {
  await assertAdmin();
  const { sendMail } = await import("@/lib/server/mail");
  const { CONTACT_EMAIL } = await import("@/lib/site");
  const res = await sendMail({
    to: CONTACT_EMAIL,
    subject: "VEYLIX test email",
    text: `This is a test from your VEYLIX admin panel.\n\nIf you can read this, customers will receive order confirmations, trial keys and your replies from ${CONTACT_EMAIL}.\n\nExample key: VLX-ABCD-EFGH-JKLM-NPQR`,
    kind: "test",
  });
  return res.sent ? { ok: true, message: `Test email sent to ${CONTACT_EMAIL}.` } : { error: res.error };
}

/* ------------------------- two-step sign-in ------------------------ */

export type MfaState = { ok?: boolean; error?: string; message?: string; setup?: { secret: string; qrSvg: string }; codes?: string[] } | undefined;

export async function startMfaAction(): Promise<MfaState> {
  await assertAdmin();
  const { beginMfaSetup } = await import("@/lib/server/totp");
  const { secret, qrSvg } = await beginMfaSetup();
  return { setup: { secret, qrSvg } };
}

export async function confirmMfaAction(prev: MfaState, fd: FormData): Promise<MfaState> {
  await assertAdmin();
  const { confirmMfaSetup } = await import("@/lib/server/totp");
  const codes = await confirmMfaSetup(str(fd, "code", 12));
  if (!codes) return { ...prev, error: "That code didn't match. Check the time on your phone and try the newest code." };
  revalidatePath("/admin/settings");
  return { ok: true, codes, message: "Two-step sign-in is on." };
}

export async function disableMfaAction(_: MfaState, fd: FormData): Promise<MfaState> {
  await assertAdmin();
  const { checkPassword } = await import("@/lib/server/auth");
  const { disableMfa, verifyMfa } = await import("@/lib/server/totp");
  if (!(await checkPassword(str(fd, "password", 200)))) return { error: "Password is incorrect." };
  if (!(await verifyMfa(str(fd, "code", 20)))) return { error: "Enter a current code or a recovery code." };
  await disableMfa();
  revalidatePath("/admin/settings");
  return { ok: true, message: "Two-step sign-in is off." };
}

export async function newRecoveryCodesAction(_: MfaState, fd: FormData): Promise<MfaState> {
  await assertAdmin();
  const { regenerateRecoveryCodes, verifyMfa } = await import("@/lib/server/totp");
  if (!(await verifyMfa(str(fd, "code", 20)))) return { error: "Enter a current 6-digit code first." };
  return { ok: true, codes: await regenerateRecoveryCodes(), message: "New recovery codes — the old ones no longer work." };
}
