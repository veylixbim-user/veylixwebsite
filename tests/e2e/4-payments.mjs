// Online payments (Paymob): card / wallet / Fawry / installments / InstaPay, automatic key issuing, security of the
// callback, retries, lost callbacks, refunds, renewals, admin payment links.
// Runs against the production build with a fake Paymob (tests/e2e/fake-paymob.mjs). Run after 1-setup.cjs.
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const postgres = require("postgres");

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.E2E_OUT || join(HERE, ".out");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const FAKE = process.env.FAKE_PAYMOB_URL || "http://127.0.0.1:4010";
const MAIL_FILE = process.env.MAIL_FILE || join(OUT, "mail.jsonl");
const CRON_SECRET = process.env.CRON_SECRET || "cron-test-secret";
const fx = JSON.parse(readFileSync(join(OUT, "fixtures.json"), "utf8"));
const sql = postgres(process.env.DATABASE_URL, { onnotice: () => {} });
const results = [];
const ok = (id, label, cond, extra = "") => { results.push({ id, cond }); console.log(`${cond ? "PASS" : "FAIL"}  ${id} ${label}${extra ? "  — " + extra : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 86_400_000;

let ipN = 1;
const ip = () => `10.88.${Math.floor(ipN / 250)}.${ipN++ % 250}`;
async function post(path, body, headers = {}) {
  const r = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip(), ...headers }, body: JSON.stringify(body) });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data, headers: r.headers };
}
async function fake(path, body) {
  const r = await fetch(FAKE + path, { method: body ? "POST" : "GET", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}
function decodeMime(raw) {
  const out = [];
  for (const part of raw.split(/\n--[^\n]+\n/)) {
    const [head, ...rest] = part.split("\n\n");
    const body = rest.join("\n\n");
    if (/base64/i.test(head)) out.push(Buffer.from(body.replace(/[^A-Za-z0-9+/=]/g, ""), "base64").toString("utf8"));
    else if (/quoted-printable/i.test(head)) out.push(Buffer.from(body.replace(/=\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), "latin1").toString("utf8"));
    else out.push(body);
  }
  return out.join("\n");
}
function decodeSubject(raw) {
  const m = raw.match(/^Subject:((?:.*)(?:\n[ \t].*)*)/im);
  if (!m) return "";
  const line = m[1].replace(/\n[ \t]+/g, " ").trim();
  return line.replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=\s*/gi, (_, enc, t) => (enc.toUpperCase() === "B" ? Buffer.from(t, "base64").toString("utf8") : Buffer.from(t.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_2, h) => String.fromCharCode(parseInt(h, 16))), "latin1").toString("utf8")));
}
const mails = () => (existsSync(MAIL_FILE) ? readFileSync(MAIL_FILE, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((m) => ({ ...m, text: decodeMime(m.body), subject: decodeSubject(m.body) })) : []);
const mailsTo = (addr) => mails().filter((m) => m.to.some((t) => t.toLowerCase().includes(addr.toLowerCase())));
async function until(fn, ms = 15000, step = 200) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(step); }
  return null;
}
const orderRow = async (id) => (await sql`SELECT * FROM orders WHERE id = ${id}`)[0];
const payRows = (id) => sql`SELECT * FROM payments WHERE order_id = ${id} ORDER BY id`;
const line = (productId, billing = "monthly", quantity = 1) => ({ productId, billing, quantity });
let n = 0;
const buyer = () => ({ name: "Pay Tester", email: `pm${++n}-${Date.now() % 100000}@example.com`, phone: "01012345678" });
const checkout = (paymentMethod, extra = {}, cust = buyer()) =>
  post("/api/checkout", { items: [line(fx.smart)], customer: cust, paymentMethod, locale: "en", ...extra });
async function paid(id) { return until(async () => (await orderRow(id))?.status === "paid"); }

// ------------------------------------------------------------------ browser contexts
const browser = await chromium.launch();
const adminCtx = await browser.newContext({ storageState: join(OUT, "state.json"), viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-for": "10.66.0.2" } });
const admin = await adminCtx.newPage();
const errors = [];
admin.on("pageerror", (e) => errors.push(e.message));
admin.on("dialog", (d) => { errors.push("dialog: " + d.message()); d.dismiss(); });

// ================================================================== settings (UI)
await admin.goto(`${BASE}/admin/settings`);
ok("PM01a", "Settings page shows the Paymob card as connected in TEST mode", await admin.locator("text=TEST mode").first().isVisible());
await admin.fill("#paymobCard", "abc");
await admin.click('button:has-text("Save settings")');
await admin.waitForSelector("text=Paymob integration IDs are numbers");
ok("PM01b", "non-numeric integration ID is refused with a clear message", true);
await admin.fill("#paymobCard", "111");
await admin.fill("#paymobWallet", "222");
await admin.fill("#paymobInstapay", "444");
await admin.fill("#paymobKiosk", "333");
await admin.fill("#paymobInstallments", "555, 556");
await admin.fill("#instapayLink", "http://not-https.example/x");
await admin.click('button:has-text("Save settings")');
await admin.waitForSelector("text=must be a full https");
ok("PM01c", "InstaPay payment link must be https", true);
await admin.fill("#instapayLink", "https://ipn.eg/S/veylix/instapay/abc123");
await admin.click('button:has-text("Save settings")');
await admin.waitForSelector("text=Settings saved");
const st = Object.fromEntries((await sql`SELECT key, value FROM settings WHERE key LIKE 'paymob_%' OR key = 'instapay_link'`).map((r) => [r.key, r.value]));
ok("PM01", "integration IDs and InstaPay link saved", st.paymob_card_id === "111" && st.paymob_wallet_id === "222" && st.paymob_kiosk_id === "333" && st.paymob_installments_ids === "555, 556" && st.instapay_link.startsWith("https://ipn.eg/"), JSON.stringify(st));
await admin.click('button:has-text("Test the Paymob connection")');
await admin.waitForSelector("text=Paymob accepted the keys");
ok("PM01d", "“Test the Paymob connection” creates an unpaid test payment request", (await fake("/__test/intentions")).some((i) => i.body.special_reference.startsWith("TEST-")));

// ================================================================== the storefront checkout
const cust = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { "x-forwarded-for": ip() } });
await cust.addInitScript((pid) => { try { localStorage.setItem("veylix-cart-v2", JSON.stringify([{ productId: pid, billing: "monthly", quantity: 1 }])); } catch {} }, fx.smart);
const shop = await cust.newPage();
shop.on("pageerror", (e) => errors.push("shop: " + e.message));
await shop.goto(`${BASE}/en/checkout`);
await shop.waitForSelector("input[name=paymentMethod]");
const tiles = await shop.locator("input[name=paymentMethod]").evaluateAll((els) => els.map((e) => e.value));
ok("PM02", "checkout offers card, wallet, InstaPay, Fawry, installments and InstaPay transfer", ["card", "wallet", "instapay", "kiosk", "installments", "transfer"].every((m) => tiles.includes(m)), tiles.join(","));
ok("PM02b", "card is preselected and the button says “Pay EGP 1,708.86 securely”", (await shop.locator("button[type=submit]").first().textContent()).includes("Pay EGP 1,708.86 securely"));
await shop.locator("label:has(input[value=transfer])").click();
ok("PM02c", "InstaPay transfer shows the number, an “Open InstaPay” button and a QR code", (await shop.locator("text=Open InstaPay").count()) > 0 && (await shop.locator("[role=img][aria-label*='Scan']").count()) === 1 && (await shop.locator("#co-paymentRef").count()) === 1);
await shop.locator("label:has(input[value=kiosk])").click();
ok("PM02d", "Fawry explains the payment code and offers “Get my payment code”", (await shop.locator("text=Get my payment code").count()) > 0 && (await shop.locator("text=payment code").count()) > 0);
await shop.goto(`${BASE}/ar/checkout`);
await shop.waitForSelector("input[name=paymentMethod]");
ok("PM02e", "the Arabic checkout shows the Arabic method names", (await shop.locator("text=محفظة إلكترونية").count()) > 0 && (await shop.locator("text=ادفع").count()) > 0);

// ================================================================== card payment, end to end in the browser
const c1 = buyer();
const custApi = cust.request; // shares the browser's cookies, like a real customer
let r = await custApi.post(`${BASE}/api/checkout`, { data: { items: [line(fx.smart)], customer: c1, paymentMethod: "card", locale: "en", elapsed: 6000 }, headers: { "x-forwarded-for": ip() } });
let d = await r.json();
const order1 = d.id;
const intents1 = await fake("/__test/intentions");
const i1 = intents1.at(-1);
ok("PM03", "card checkout returns Paymob's secure payment page", r.status() === 200 && d.ok && d.payUrl?.startsWith(`${FAKE}/unifiedcheckout/?publicKey=pk_test_fake&clientSecret=csk_test_`), d.payUrl?.slice(0, 60));
const o1 = await orderRow(order1);
const vatItem = i1.body.items.find((x) => /VAT/.test(x.name));
ok("PM03b", "intention: exact amount in piasters, card integration only, items incl. VAT add up", i1.body.amount === 170886 && i1.body.currency === "EGP" && JSON.stringify(i1.body.payment_methods) === "[111]" && i1.body.items.reduce((s, x) => s + x.amount * x.quantity, 0) === 170886 && vatItem?.amount === 20986, `${i1.body.amount}`);
ok("PM03c", "intention: phone in +20 form, our reference, callback and return addresses", i1.body.billing_data.phone_number === "+201012345678" && i1.body.special_reference.startsWith(order1 + "-") && i1.body.notification_url === `${BASE}/api/paymob/callback` && i1.body.redirection_url === `${BASE}/api/paymob/return/${order1}`);
ok("PM03d", "order is pending, online, no transfer reference; payment attempt recorded", o1.status === "pending" && o1.method === "paymob" && o1.payment_ref === "" && (await payRows(order1))[0]?.provider_order_id === String(i1.orderId));
const cookies = await cust.cookies();
ok("PM03e", "the order token is kept in an HttpOnly cookie in the customer's browser (never sent to Paymob)", cookies.some((c) => c.name.startsWith("vx_o_") && c.httpOnly && c.value === o1.access_token) && !JSON.stringify(i1.body).includes(o1.access_token));

await shop.goto(d.payUrl);
ok("PM04a", "hosted payment page opens", (await shop.locator("h1").textContent()).includes("EGP 1708.86"));
await shop.click("#success");
await shop.waitForURL(/\/en\/order\/VX-/);
ok("PM04", "after paying, the customer lands on their order page — licensed, no waiting", (await shop.locator("h1").textContent()).includes("You're licensed"), shop.url().replace(o1.access_token, "<token>"));
const o1b = await orderRow(order1);
const key1 = (typeof o1b.license_keys === "string" ? JSON.parse(o1b.license_keys) : o1b.license_keys)[0]?.key;
ok("PM04b", "order paid automatically; key issued for ~1 month; transfer reference is PAYMOB-<transaction>", o1b.status === "paid" && /^VLX-/.test(key1) && /^PAYMOB-\d+$/.test(o1b.payment_ref) && o1b.paid_at && o1b.invoice_number, `${o1b.payment_ref}`);
ok("PM04c", "the page shows the key and “Paid online”", (await shop.locator(`text=${key1}`).count()) > 0 && (await shop.locator("text=Paid online").count()) > 0);
const pay1 = (await payRows(order1))[0];
ok("PM04d", "payment row: paid, transaction id, method from Paymob", pay1.status === "paid" && !!pay1.transaction_id && /card:MasterCard/.test(pay1.method));
const m1 = await until(() => mailsTo(c1.email).find((m) => m.text.includes(key1)));
ok("PM05", "customer is emailed the key automatically (English + Arabic)", !!m1 && /online payment/.test(m1.text) && /مفاتيح المنتج/.test(m1.text));
ok("PM05b", "the owner is told about the online sale", mails().some((m) => m.to.some((t) => t.includes("veylixbim@gmail.com")) && m.text.includes(order1) && /Nothing to do/.test(m.text)));

// ================================================================== callback security
const keysBefore = (await sql`SELECT count(*)::int n FROM license_keys WHERE order_id = ${order1}`)[0].n;
const mailsBefore = mails().length;
let rep = await fake("/__test/deliver", { orderId: order1, outcome: "success", txnId: pay1.transaction_id });
ok("PM06", "the same confirmation delivered twice changes nothing (no second key, no second email)", rep.siteStatus === 200 && JSON.parse(rep.siteBody).outcome === "duplicate" && (await sql`SELECT count(*)::int n FROM license_keys WHERE order_id = ${order1}`)[0].n === keysBefore && mails().length === mailsBefore);

const c2 = buyer();
r = await checkout("card", {}, c2); const order2 = r.data.id;
rep = await fake("/__test/deliver", { orderId: order2, outcome: "success", badHmac: true });
ok("PM07", "a confirmation with a wrong signature is refused (401) and the order stays unpaid", rep.siteStatus === 401 && (await orderRow(order2)).status === "pending");
ok("PM07b", "…and it is logged as a security event", (await sql`SELECT count(*)::int n FROM security_events WHERE kind = 'payment_hmac_failed'`)[0].n >= 1);
const bare = await fetch(`${BASE}/api/paymob/callback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "TRANSACTION", obj: { success: true, amount_cents: 1, id: 1, order: { id: 1 } } }) });
ok("PM07c", "an unsigned, hand-made callback is refused", bare.status === 401);
const garbage = await fetch(`${BASE}/api/paymob/callback?hmac=zz`, { method: "POST", headers: { "content-type": "application/json" }, body: "not json" });
ok("PM07d", "garbage in the callback is a 400, not a crash", garbage.status === 400);
const other = await fetch(`${BASE}/api/paymob/callback?hmac=zz`, { method: "GET" });
ok("PM07e", "callback endpoint accepts POST only", other.status === 405);

rep = await fake("/__test/deliver", { orderId: order2, outcome: "success", amountCents: 100 });
const o2 = await orderRow(order2);
ok("PM08", "a correctly signed payment of the WRONG amount does not issue keys", JSON.parse(rep.siteBody).outcome === "mismatch" && o2.status === "pending" && (await payRows(order2))[0].status === "mismatch");
ok("PM08b", "…and the owner is alerted", mails().some((m) => /amount mismatch/i.test(m.subject) && m.text.includes(order2)));
rep = await fake("/__test/deliver", { orderId: order2, outcome: "success", type: "TOKEN" });
ok("PM08c", "other callback types (saved-card tokens) are ignored", JSON.parse(rep.siteBody).ignored === true);
rep = await fake("/__test/deliver", { unknownOrder: true });
ok("PM09", "a valid signature for an order that isn't ours is ignored and logged", JSON.parse(rep.siteBody).outcome === "unknown" && (await sql`SELECT count(*)::int n FROM security_events WHERE kind = 'payment_unknown_order'`)[0].n >= 1);

// ================================================================== declined, retry
const c3 = buyer();
r = await custApi.post(`${BASE}/api/checkout`, { data: { items: [line(fx.smart)], customer: c3, paymentMethod: "card", locale: "en" }, headers: { "x-forwarded-for": ip() } });
d = await r.json(); const order3 = d.id; const tok3 = d.token;
rep = await fake("/__test/deliver", { orderId: order3, outcome: "declined" });
const o3 = await orderRow(order3);
ok("PM10", "a declined payment leaves the order open and marks the attempt failed", JSON.parse(rep.siteBody).outcome === "failed" && o3.status === "pending" && (await payRows(order3))[0].status === "failed");
await shop.goto(`${BASE}/en/order/${order3}?t=${tok3}`);
ok("PM10b", "the order page says the payment didn't go through and offers the methods again", (await shop.locator("text=That payment didn't go through").count()) > 0 && (await shop.locator("button:has-text('Pay with Card')").count()) === 1);
await shop.click("button:has-text('Pay with Card')");
await shop.waitForURL(/unifiedcheckout/);
await shop.click("#success");
await shop.waitForURL(/\/en\/order\/VX-/);
ok("PM10c", "retrying with the same order works; two attempts recorded (failed, paid)", (await shop.locator("h1").textContent()).includes("You're licensed") && (await payRows(order3)).map((p) => p.status).join() === "failed,paid");

// ================================================================== lost callback → safety nets
const c4 = buyer();
r = await checkout("card", {}, c4); const order4 = r.data.id; const tok4 = r.data.token;
await fake("/__test/settle", { orderId: order4, outcome: "success" });
ok("PM11a", "before anything arrives the order is unpaid", (await orderRow(order4)).status === "pending");
let st4 = await fetch(`${BASE}/api/pay/status?id=${order4}&t=${tok4}`, { headers: { "x-forwarded-for": ip() } }).then((x) => x.json());
ok("PM11", "callback never arrived: the order page's status check asks Paymob and completes the order", st4.status === "paid" && (await orderRow(order4)).status === "paid", JSON.stringify(st4));
ok("PM11b", "…and the customer still gets the key by email", !!(await until(() => mailsTo(c4.email).find((m) => /VLX-/.test(m.text)))));

const c5 = buyer();
r = await custApi.post(`${BASE}/api/checkout`, { data: { items: [line(fx.smart)], customer: c5, paymentMethod: "wallet", locale: "en" }, headers: { "x-forwarded-for": ip() } });
d = await r.json(); const order5 = d.id;
const cs5 = new URL(d.payUrl).searchParams.get("clientSecret");
await shop.goto(`${FAKE}/__pay?cs=${cs5}&outcome=success&callback=0`);
await shop.waitForURL(/\/en\/order\/VX-/);
ok("PM12", "callback lost but the customer's redirect is signed: order completes from the redirect", (await orderRow(order5)).status === "paid" && (await sql`SELECT source FROM payment_events WHERE payment_id = ${(await payRows(order5))[0].id} AND outcome = 'success'`)[0]?.source === "redirect");
ok("PM12b", "wallet payments use the wallet integration ID", JSON.stringify((await fake("/__test/intentions")).find((i) => i.body.special_reference.startsWith(order5)).body.payment_methods) === "[222]");

// a forged redirect (right shape, wrong signature) must not pay or reveal anything
const c6 = buyer();
r = await checkout("card", {}, c6); const order6 = r.data.id;
const forged = await fetch(`${BASE}/api/paymob/return/${order6}?id=1&order=${(await payRows(order6))[0].provider_order_id}&success=true&pending=false&amount_cents=170886&currency=EGP&hmac=${"0".repeat(128)}`, { redirect: "manual", headers: { "x-forwarded-for": ip() } });
ok("PM13", "a forged redirect neither pays the order nor reveals its link (no token in the Location)", (await orderRow(order6)).status === "pending" && forged.status === 303 && !forged.headers.get("location").includes("?t="), forged.headers.get("location"));

// a valid redirect from someone else's payment can't fetch this order's link
const foreign = await fetch(`${BASE}/api/paymob/return/${order6}`, { redirect: "manual", headers: { "x-forwarded-for": ip() } });
ok("PM13b", "opening the return address without a cookie or signature gives no token", foreign.status === 303 && !foreign.headers.get("location").includes("?t="));

// ================================================================== other methods, Fawry (pending → paid)
const methodIds = {};
for (const [m, expected] of [["kiosk", "[333]"], ["installments", "[555,556]"], ["instapay", "[444]"]]) {
  r = await checkout(m); methodIds[m] = JSON.stringify((await fake("/__test/intentions")).find((i) => i.body.special_reference.startsWith(r.data.id))?.body.payment_methods) === expected;
}
ok("PM14", "Fawry, installments and InstaPay each use their own integration IDs", Object.values(methodIds).every(Boolean), JSON.stringify(methodIds));

const c7 = buyer();
r = await custApi.post(`${BASE}/api/checkout`, { data: { items: [line(fx.smart)], customer: c7, paymentMethod: "kiosk", locale: "en" }, headers: { "x-forwarded-for": ip() } });
d = await r.json(); const order7 = d.id; const tok7 = d.token;
ok("PM14b", "Fawry intention is valid for 2 days", (await fake("/__test/intentions")).find((i) => i.body.special_reference.startsWith(order7)).body.expiration === 172800);
rep = await fake("/__test/deliver", { orderId: order7, outcome: "pending" });
await shop.goto(`${BASE}/en/order/${order7}?t=${tok7}`);
ok("PM15", "Fawry code issued: order waits, page explains where to pay", (await orderRow(order7)).status === "pending" && (await payRows(order7))[0].status === "pending" && (await shop.locator("text=Waiting for your Fawry payment").count()) > 0);
rep = await fake("/__test/deliver", { orderId: order7, outcome: "success" });
ok("PM15b", "customer pays at the outlet: the callback issues the key (hours later is fine)", JSON.parse(rep.siteBody).outcome === "paid" && (await orderRow(order7)).status === "paid");
await shop.reload();
ok("PM15c", "the waiting page updates to licensed on refresh", (await shop.locator("h1").textContent()).includes("You're licensed"));

// ================================================================== a second payment / refund
const c8 = buyer();
r = await custApi.post(`${BASE}/api/checkout`, { data: { items: [line(fx.smart)], customer: c8, paymentMethod: "card", locale: "en" }, headers: { "x-forwarded-for": ip() } });
d = await r.json(); const order8 = d.id;
const ref1 = (await payRows(order8))[0].special_reference;
r = await custApi.post(`${BASE}/api/pay/start`, { data: { orderId: order8, method: "card" }, headers: { "x-forwarded-for": ip() } });
ok("PM16a", "the cookie alone is enough to start another attempt (no token in the request)", r.status() === 200 && (await r.json()).ok === true);
const ref2 = (await payRows(order8))[1].special_reference;
await fake("/__test/deliver", { orderId: order8, reference: ref1, outcome: "success" });
const keysO8 = (await sql`SELECT count(*)::int n FROM license_keys WHERE order_id = ${order8}`)[0].n;
rep = await fake("/__test/deliver", { orderId: order8, reference: ref2, outcome: "success" });
ok("PM16", "a second successful payment on an already-paid order issues nothing and alerts the owner to refund", JSON.parse(rep.siteBody).outcome === "duplicate_payment" && (await sql`SELECT count(*)::int n FROM license_keys WHERE order_id = ${order8}`)[0].n === keysO8 && mails().some((m) => /Second payment/i.test(m.subject) && m.text.includes(order8)));

const o8 = await orderRow(order8);
const key8 = (typeof o8.license_keys === "string" ? JSON.parse(o8.license_keys) : o8.license_keys)[0].key;
rep = await fake("/__test/deliver", { orderId: order8, reference: ref1, outcome: "refunded" });
ok("PM17", "a refund reported by Paymob is recorded and the owner alerted; the key is NOT revoked automatically", JSON.parse(rep.siteBody).outcome === "refunded" && (await payRows(order8))[0].status === "refunded" && (await sql`SELECT revoked FROM license_keys WHERE key = ${key8}`)[0].revoked === false && mails().some((m) => /refunded/i.test(m.subject) && m.text.includes(order8)));

// ================================================================== renewal paid online
const RENEW = "VLX-TEST-RENW-0001-ABCD";
const oldEnd = new Date(Date.now() + 10 * DAY);
const c9 = buyer();
await sql`INSERT INTO license_keys (key, product_id, assigned_to, expires_at) VALUES (${RENEW}, ${fx.smart}, ${c9.email}, ${oldEnd}) ON CONFLICT (key) DO UPDATE SET expires_at = ${oldEnd}`;
r = await checkout("card", { renewKey: RENEW }, c9); const order9 = r.data.id;
rep = await fake("/__test/deliver", { orderId: order9, outcome: "success" });
const newEnd = new Date((await sql`SELECT expires_at FROM license_keys WHERE key = ${RENEW}`)[0].expires_at);
const want = new Date(oldEnd); want.setMonth(want.getMonth() + 1);
ok("PM18", "renewing online extends the SAME key from its old end date (no days lost)", JSON.parse(rep.siteBody).outcome === "paid" && Math.abs(newEnd - want) < 2000, `${newEnd.toISOString().slice(0, 10)} vs ${want.toISOString().slice(0, 10)}`);
ok("PM18b", "…and no new key was created for that order", (await sql`SELECT count(*)::int n FROM license_keys WHERE order_id = ${order9}`)[0].n === 1);

// ================================================================== admin: payment link
await admin.goto(`${BASE}/admin/orders`);
await admin.getByRole("button", { name: /New payment link/ }).click();
await admin.waitForSelector("[role=dialog]");
const linkCust = { name: "Link Customer", email: `link-${Date.now() % 100000}@example.com`, phone: "01198765432" };
await admin.fill("#pl-name", linkCust.name);
await admin.fill("#pl-email", linkCust.email);
await admin.fill("#pl-phone", linkCust.phone);
await admin.selectOption("#pl-product", fx.smart);
await admin.getByRole("dialog").getByRole("button", { name: /Create payment link/ }).click();
await admin.waitForSelector("text=Payment link created");
const linkText = (await admin.locator("[role=dialog] .font-mono.break-all").first().textContent()).trim().replace(/\s+/g, "");
const linkUrl = linkText.match(/http[^\s]+/)[0].replace(/Copy.*$/, "");
const linkOrder = linkUrl.match(/order\/(VX-[A-Z0-9-]+)/)[1];
const lo = await orderRow(linkOrder);
ok("PM19", "admin creates a payment link: pending online order for that customer", lo.status === "pending" && lo.method === "paymob" && lo.customer_email === linkCust.email && linkUrl.includes(`t=${lo.access_token}`));
ok("PM19b", "the customer is emailed the link (English + Arabic)", !!(await until(() => mailsTo(linkCust.email).find((m) => m.text.includes(linkOrder) && /رابط الدفع/.test(m.text)))));

const fresh = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip() } }); // no cookies: opened from WhatsApp on another phone
const fp = await fresh.newPage();
await fp.goto(linkUrl);
ok("PM19c", "opening the link shows “Complete your payment” with the payment methods", (await fp.locator("h1").textContent()).includes("Complete your payment") && (await fp.locator("button:has-text('Pay with')").count()) >= 4);
await fp.click("button:has-text('Pay with Card')");
await fp.waitForURL(/unifiedcheckout/);
await fp.click("#success");
await fp.waitForURL(/\/en\/order\/VX-/);
ok("PM19d", "paying from a fresh browser works; the signed redirect brings them back to their order, licensed", (await fp.locator("h1").textContent()).includes("You're licensed") && (await orderRow(linkOrder)).status === "paid");
await fresh.close();

// a link for renewing a key
await admin.goto(`${BASE}/admin/orders`);
await admin.getByRole("button", { name: /New payment link/ }).click();
await admin.fill("#pl-name", "Renew Customer");
await admin.fill("#pl-email", `renewlink-${Date.now() % 100000}@example.com`);
await admin.fill("#pl-phone", "01198765432");
await admin.selectOption("#pl-product", fx.smart);
await admin.fill("#pl-renew", "VLX-NOPE-NOPE-NOPE-NOPE");
await admin.getByRole("dialog").getByRole("button", { name: /Create payment link/ }).click();
await admin.waitForSelector("text=key was not found");
ok("PM19e", "a payment link for an unknown key is refused with a clear message", true);
await admin.keyboard.press("Escape");

// ================================================================== admin orders / payments screens
await admin.goto(`${BASE}/admin/orders?status=online`);
const unpaidCount = await admin.locator("ul.grid > li").count();
ok("PM20", "“Online — unpaid” lists checkouts nobody paid yet, separate from transfers you must check", unpaidCount >= 1 && (await admin.locator("text=not paid yet").count()) >= 1);
await admin.goto(`${BASE}/admin/orders?status=pending`);
ok("PM20b", "“Needs your check” does not list unpaid online checkouts", (await admin.locator("text=not paid yet").count()) === 0);

// admin "Check with Paymob" for a payment whose confirmation was lost
const c10 = buyer();
r = await checkout("card", {}, c10); const order10 = r.data.id;
await fake("/__test/settle", { orderId: order10, outcome: "success" });
await admin.goto(`${BASE}/admin/orders?status=online`);
await admin.locator("li", { hasText: order10 }).getByRole("button", { name: /Check with Paymob/ }).click();
ok("PM21", "admin “Check with Paymob” completes a payment whose confirmation was lost", !!(await paid(order10)));

await admin.goto(`${BASE}/admin/orders?status=paid`);
const card1 = admin.locator("li", { hasText: order1 });
ok("PM22", "paid online orders show the method and status to the owner", (await card1.locator("text=online").count()) > 0 && (await card1.locator("text=card").count()) > 0 && (await card1.locator("text=Card · MasterCard").count()) > 0);
await admin.goto(`${BASE}/admin/payments`);
ok("PM22b", "Payments page lists attempts and totals", (await admin.locator("table tbody tr").count()) >= 10 && (await admin.locator("text=Paid online — last 30 days").count()) === 1);
ok("PM22c", "no unexpected browser errors in the admin screens", errors.length === 0, errors.join(" | "));

// ================================================================== guards on the payment endpoints
r = await post("/api/pay/start", { orderId: order3, token: "wrong-token", method: "card" });
ok("PM23", "starting a payment needs the order's token (wrong token → 404)", r.status === 404);
r = await post("/api/pay/start", { orderId: order4, token: tok4, method: "card" });
ok("PM23b", "a paid order can't start another payment", r.status === 409 && r.data.errors.form === "not_pending");
r = await post("/api/pay/start", { orderId: order3, token: tok3, method: "bitcoin" });
ok("PM23c", "unknown payment method → 400", r.status === 400);
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer(), paymentMethod: "card" }, { origin: "https://evil.example" });
ok("PM24", "a checkout posted from another website (cross-site) is refused", r.status === 403);
r = await post("/api/pay/start", { orderId: order3, token: tok3, method: "card" }, { origin: "https://evil.example", "sec-fetch-site": "cross-site" });
ok("PM24b", "…and so is starting a payment cross-site", r.status === 403 && (await sql`SELECT count(*)::int n FROM security_events WHERE kind = 'origin_blocked'`)[0].n >= 2);
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer(), paymentMethod: "card", website: "http://spam.example" });
ok("PM25", "bots that fill the hidden field are refused", r.status === 400 && r.data.errors.form === "bot");
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer(), paymentMethod: "card", elapsed: 200 });
ok("PM25b", "a form 'submitted' in 0.2 s is refused", r.status === 400 && r.data.errors.form === "bot");
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer(), paymentMethod: "card", elapsed: 4000 });
ok("PM25c", "a normal person is fine", r.status === 200 && r.data.ok);
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer(), paymentMethod: "dogecoin" });
ok("PM25d", "an unknown method falls back to the manual transfer, which then needs a reference", r.status === 400 && r.data.errors.paymentRef === "paymentRef");

// ================================================================== fallbacks
const c11 = buyer();
r = await checkout("card", {}, c11); const order11 = r.data.id; const tok11 = r.data.token;
r = await post("/api/pay/manual", { orderId: order11, token: tok11, paymentRef: "IPN-PM-9001" });
const o11 = await orderRow(order11);
ok("PM26", "gave up on the card: customer switches to an InstaPay transfer — it joins the owner's “needs your check” list", r.data.ok && o11.method === "instapay" && o11.payment_ref === "IPN-PM-9001");
r = await checkout("card", {}, buyer()); const order12 = r.data.id; const tok12 = r.data.token;
r = await post("/api/pay/manual", { orderId: order12, token: tok12, paymentRef: "ipn pm 9001" });
ok("PM26b", "the same transfer reference can't be used twice", r.status === 400 && r.data.errors.paymentRef === "paymentRefUsed");
r = await post("/api/pay/manual", { orderId: order12, token: "nope", paymentRef: "IPN-PM-9002" });
ok("PM26c", "…and it needs the order token", r.status === 404);

await fake("/__test/next-error", { status: 503 });
const c13 = buyer();
r = await checkout("card", {}, c13);
ok("PM27", "Paymob outage: the order is still created and the customer is sent to the order page to retry", r.data.ok && !r.data.payUrl && r.data.payError === "gateway" && (await payRows(r.data.id))[0].status === "error");
r = await post("/api/pay/start", { orderId: r.data.id, token: r.data.token, method: "card" });
ok("PM27b", "retrying after the outage works", r.data.ok && r.data.url.includes("unifiedcheckout"));

await sql`INSERT INTO settings (key, value) VALUES ('online_payments_enabled', '0') ON CONFLICT (key) DO UPDATE SET value = '0'`;
r = await checkout("card");
ok("PM28", "with online payments switched off, cards are refused", r.status === 400 && r.data.errors.form === "method_unavailable");
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer(), paymentMethod: "transfer", paymentRef: "IPN-PM-9100" });
ok("PM28b", "…and the InstaPay transfer still works", r.data.ok === true);
await sql`UPDATE settings SET value = '1' WHERE key = 'online_payments_enabled'`;

// ================================================================== daily reconcile
const c14 = buyer();
r = await checkout("card", {}, c14); const order14 = r.data.id;
await fake("/__test/settle", { orderId: order14, outcome: "success" });
await sql`UPDATE payments SET created_at = now() - interval '10 minutes' WHERE order_id = ${order14}`;
const noAuth = await fetch(`${BASE}/api/cron/payments`);
const cron = await fetch(`${BASE}/api/cron/payments`, { headers: { authorization: `Bearer ${CRON_SECRET}` } }).then((x) => x.json());
ok("PM29", "the daily job asks Paymob about open payments and completes the ones it missed (needs the cron secret)", noAuth.status === 401 && cron.paid >= 1 && (await orderRow(order14)).status === "paid", JSON.stringify(cron));

// old unpaid online checkouts are cleared after 30 days
const c15 = buyer();
r = await checkout("card", {}, c15); const order15 = r.data.id;
await sql`UPDATE orders SET created_at = now() - interval '40 days' WHERE id = ${order15}`;
await fetch(`${BASE}/api/cron/payments`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
ok("PM30", "unpaid online checkouts older than 30 days are cleared", !(await orderRow(order15)));

// ================================================================== the customer's own order page rules
const nope = await shop.goto(`${BASE}/en/order/${order1}?t=wrong`);
ok("PM31", "someone else's order page with a wrong token shows nothing", (await shop.locator(`text=${key1}`).count()) === 0 && (await shop.locator("text=couldn't find this order").count()) > 0);
await browser.close();
await sql.end();

const failed = results.filter((x) => !x.cond);
console.log(`\npayments: ${results.length - failed.length}/${results.length} passed${failed.length ? "  — FAILED: " + failed.map((x) => x.id).join(", ") : ""}`);
process.exit(failed.length ? 1 : 0);
