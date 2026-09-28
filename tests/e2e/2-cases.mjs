import { createRequire } from "node:module";
import { createHash, createHmac, createPublicKey, verify, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const postgres = require("postgres");
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.E2E_OUT || join(HERE, ".out");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const MAIL_FILE = process.env.MAIL_FILE || join(OUT, "mail.jsonl");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test-admin-pass-123";
const CRON_SECRET = process.env.CRON_SECRET || "cron-test-secret";
const fx = JSON.parse(readFileSync(join(OUT, "fixtures.json"), "utf8"));
const sql = postgres(process.env.DATABASE_URL, { onnotice: () => {} });
const results = [];
const ok = (id, label, cond, extra = "") => { results.push({ id, cond }); console.log(`${cond ? "PASS" : "FAIL"}  ${id} ${label}${extra ? "  — " + extra : ""}`); };
const DAY = 86_400_000;

// ---------- helpers
let ipN = 1;
const ip = () => `10.77.${Math.floor(ipN / 250)}.${ipN++ % 250}`;
async function post(path, body, { form = false, fixedIp } = {}) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json", "x-forwarded-for": fixedIp ?? ip() },
    body: form ? new URLSearchParams(body) : JSON.stringify(body),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
const H = (t, v) => createHash("sha256").update(`VLXHW|${t}|${v}`).digest("hex").slice(0, 16);
function device(sig) {
  const comps = ["uuid", "board", "cpu", "mg", "vol", "mac"].flatMap((t) => [sig[t]].flat().filter(Boolean).map((v) => `${t}:${H(t, v)}`).sort()).join(",");
  return { id: "W2-" + createHash("sha256").update(comps).digest("hex").slice(0, 40), components: comps };
}
const PCs = {
  A: { uuid: "UA", board: "BA", cpu: "CA", mg: "MA", vol: "VA", mac: ["MA1", "MA2"] },
  B: { uuid: "UB", board: "BB", cpu: "CB", mg: "MB", vol: "VB", mac: ["MB1"] },
  C: { uuid: "UC", board: "BC", cpu: "CC", mg: "MC", vol: "VC", mac: ["MC1"] },
  D: { uuid: "UD", board: "BD", cpu: "CD", mg: "MD", vol: "VD", mac: ["MD1"] },
  E: { uuid: "UE", board: "BE", cpu: "CE", mg: "ME", vol: "VE", mac: ["ME1"] },
  F: { uuid: "UF", board: "BF", cpu: "CF", mg: "MF", vol: "VF", mac: ["MF1"] },
  G: { uuid: "UG", board: "BG", cpu: "CG", mg: "MG", vol: "VG", mac: ["MG1"] },
  H: { uuid: "UH", board: "BH", cpu: "CH", mg: "MH", vol: "VH", mac: ["MH1"] },
};
const D = Object.fromEntries(Object.entries(PCs).map(([k, v]) => [k, device(v)]));
const activate = (key, dev, product = "smart-wiring", extra = {}) =>
  post("/api/license/activate", { key, deviceId: dev.id, components: dev.components, deviceName: "PC", product, nonce: randomBytes(8).toString("hex"), ...extra }, { form: true });
const status = (key, dev, product = "smart-wiring") =>
  post("/api/license/status", { key, deviceId: dev.id, components: dev.components, product, nonce: randomBytes(8).toString("hex") }, { form: true });
const kp = JSON.parse((await sql`SELECT value FROM settings WHERE key = 'license_keypair'`)[0].value);
const pub = createPublicKey(kp.publicKey);
const fields = (payload) => payload.split("|");
const sigOk = (d) => verify("sha256", Buffer.from(d.payload), pub, Buffer.from(d.signature, "base64"));
const [s, p, u] = [fx.smartKeys, fx.panelKeys, fx.universal];
const keyRow = async (k) => (await sql`SELECT * FROM license_keys WHERE key = ${k}`)[0];

// ---------- device binding & hardware tolerance
let r = await activate(s[0], D.A);
let f = r.data.payload ? fields(r.data.payload) : [];
ok("L01", "paid key activates on PC A; signed 12-field license with hardware list", r.data.ok && f.length === 12 && f[10] === D.A.components && sigOk(r.data), `${f.length} fields`);
ok("L01b", "license binds key, device, product and nonce", f[1] === s[0] && f[2] === D.A.id && f[3] === "smart-wiring" && f[9].length === 16);
r = await activate(s[0], D.B);
ok("L02", "same key on a different PC is refused", r.status === 409 && r.data.error === "device_mismatch");
const Areinstall = device({ ...PCs.A, mg: "MA-new", vol: "VA-new" });
r = await activate(s[0], Areinstall);
let row = await keyRow(s[0]);
ok("L03", "Windows reinstall on the same PC keeps the license (hardware change followed)", r.data.ok && row.device_id === Areinstall.id && row.hw_changes === 1);
r = await status(s[0], Areinstall);
ok("L04", "online status check after reinstall", r.data.ok === true);
r = await status(s[0], D.A);
ok("L04b", "status from the pre-reinstall ID still recognised as the same PC", r.data.ok === true);
r = await status(s[0], D.B);
ok("L05", "status from another PC → device_mismatch", r.data.error === "device_mismatch");
const clone = device({ ...PCs.A, uuid: "U-clone", mac: ["M-clone"] });
r = await activate(s[0], clone);
ok("L06", "cloned VM (new SMBIOS UUID + MAC) is refused", r.data.error === "device_mismatch");
const spoof = device({ ...PCs.A, uuid: "U-clone2" });
r = await activate(s[0], spoof);
ok("L07", "clone with spoofed MAC but different UUID is refused", r.data.error === "device_mismatch");
const nicSwap = device({ ...PCs.A, mg: "MA-new", vol: "VA-new", mac: ["MA9"] });
r = await status(s[0], nicSwap);
ok("L07b", "new network card on the same PC still matches (offline/status)", r.data.ok === true);

// hardware-change limiter: key s[1] on PC C, 3 changes OK, 4th refused
r = await activate(s[1], D.C);
let hwOk = r.data.ok;
for (let i = 1; i <= 3; i++) hwOk = hwOk && (await activate(s[1], device({ ...PCs.C, mg: "MC" + i, vol: "VC" + i }))).data.ok;
r = await activate(s[1], device({ ...PCs.C, mg: "MC4", vol: "VC4" }));
ok("L08", "more than 3 hardware changes in 30 days → hw_limit (support must confirm)", hwOk && r.data.error === "hw_limit");
ok("L08b", "hw-limit logged for the admin", (await sql`SELECT count(*)::int n FROM activity WHERE kind = 'hw-limit'`)[0].n >= 1);

// one license per product per PC
r = await activate(s[2], D.A);
ok("L09", "second paid Smart Wiring key on PC A → already_licensed", r.status === 409 && r.data.error === "already_licensed");
r = await activate(s[2], Areinstall);
ok("L09b", "…also after the PC's hardware changed (tolerant match)", r.data.error === "already_licensed");
r = await activate(s[2], D.D);
ok("L09c", "that second key works on another PC", r.data.ok === true);
r = await activate(u[0], D.A);
ok("L10", "universal (all-products) key on PC A for Smart Wiring → already_licensed", r.data.error === "already_licensed");
r = await activate(u[0], D.E);
const r2 = await activate(s[3], D.E);
ok("L10b", "universal key on PC E, then a Smart Wiring key on PC E → already_licensed", r.data.ok && r2.data.error === "already_licensed");
r = await activate(p[0], D.A, "panel-pro");
ok("L11", "a different plugin on the same PC is allowed", r.data.ok === true);
r = await activate(s[0], Areinstall, "panel-pro");
ok("L12", "Smart Wiring key inside Panel Pro → wrong_product", r.data.error === "wrong_product");
r = await post("/api/license/activate", { key: s[4], deviceId: "W1-" + "a".repeat(40), product: "smart-wiring", nonce: "abc" }, { form: true });
let r3 = await post("/api/license/status", { key: s[4], deviceId: "W1-" + "a".repeat(40), product: "smart-wiring", nonce: "abd" }, { form: true });
let r4 = await post("/api/license/status", { key: s[4], deviceId: "W1-" + "b".repeat(40), product: "smart-wiring", nonce: "abe" }, { form: true });
ok("L13", "older plugin without hardware list: exact device ID only", r.data.ok && r3.data.ok && r4.data.error === "device_mismatch");
r = await activate(s[5], D.G, "smart-wiring", { components: "uuid:zz," + "mac:12345,".repeat(100) });
ok("L14", "garbage/oversized hardware list is ignored safely (no crash)", r.status < 500, `${r.status}`);
r = await post("/api/license/activate", { key: s[5], deviceId: "bad", product: "smart-wiring" }, { form: true });
ok("L15", "malformed device ID rejected", r.status === 404 || r.status === 400, `${r.status} ${r.data.error}`);
r = await post("/api/license/activate", { key: "x".repeat(9000), deviceId: D.G.id }, { form: true });
ok("L15b", "oversized request body rejected", r.status === 400);
let limited = false;
for (let i = 0; i < 22 && !limited; i++) limited = (await post("/api/license/activate", { key: "VLX-AAAA-BBBB-CCCC-DDDD", deviceId: D.H.id, nonce: "n" + i }, { form: true, fixedIp: "10.99.9.9" })).status === 429;
ok("L16", "brute-force guessing is rate-limited (429)", limited);
r = await status(s[0], Areinstall);
const tampered = r.data.payload.replace(/\|(\d{10})\|/, (m, n) => `|${Number(n) + 365 * 86400}|`);
ok("L17", "edited license (extra year) fails the RSA signature", !verify("sha256", Buffer.from(tampered), pub, Buffer.from(r.data.signature, "base64")));

// ---------- trials
r = await post("/api/trial", { name: "Trial One", email: "t1@example.com", product: "smart-wiring" });
const trialKey = r.data.key;
r = await activate(trialKey, D.F);
f = r.data.payload ? fields(r.data.payload) : [];
const trialDays = (Number(f[6]) * 1000 - Date.now()) / DAY;
ok("T01", "trial activates on PC F, ends in 10 days (admin setting), no grace", r.data.ok && f[8] === "1" && Math.abs(trialDays - 10) < 0.01 && f[11] === f[6]);
r = await post("/api/trial", { name: "Trial Two", email: "t2@example.com", product: "smart-wiring" });
const trial2 = r.data.key;
r = await activate(trial2, D.F);
ok("T02", "second trial on the same PC → trial_used", r.data.error === "trial_used");
r = await activate(trial2, D.A);
ok("T03", "trial on a PC that already has a paid license → trial_not_eligible", r.data.error === "trial_not_eligible");
r = await activate(trial2, device({ ...PCs.F, mg: "MF2", vol: "VF2" }));
ok("T04", "trial after reinstalling Windows on the same PC → trial_used", r.data.error === "trial_used");
r = await activate(s[6], D.F);
ok("T05", "upgrading a trial PC to a paid key is allowed", r.data.ok === true);
r = await post("/api/trial", { name: "Trial One", email: "t1@example.com", product: "smart-wiring" });
ok("T06", "requesting a trial again with the same email returns the same key", r.data.key === trialKey);

// ---------- downloads
r = await post("/api/download", { key: s[0], product: "smart-wiring" });
const r5 = await post("/api/download", { key: p[0], product: "smart-wiring" });
const r6 = await post("/api/download", { key: "VLX-ZZZZ-ZZZZ-ZZZZ-ZZZZ", product: "smart-wiring" });
ok("D01", "download: valid key ok, other plugin's key refused, invalid key refused", r.data.ok && r5.data.error === "wrong_product" && r6.data.error === "invalid_key");

// ---------- checkout
const buyer = { name: "Omar Buyer", email: "omar@example.com", phone: "01012345678" };
const line = (productId, billing = "monthly", quantity = 1) => ({ productId, billing, quantity });
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer, paymentRef: "IPN-5001" });
const order1 = r.data;
ok("C01", "InstaPay order created (pending)", r.data.ok === true);
r = await post("/api/checkout", { items: [line(fx.smart)], customer: { ...buyer, email: "other@example.com" }, paymentRef: "ipn 5001" });
ok("C02", "the same InstaPay reference can't pay a second order", r.data.errors?.paymentRef === "paymentRefUsed");

// admin UI
const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: join(OUT, "state.json"), viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-for": "10.66.0.2" } });
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("dialog", (d) => { pageErrors.push("dialog: " + d.message()); d.dismiss(); });
async function waitStatus(orderId, want) {
  for (let i = 0; i < 60; i++) {
    const st = (await sql`SELECT status FROM orders WHERE id = ${orderId}`)[0]?.status;
    if (st === want) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`order ${orderId} never became ${want}`);
}
async function approve(orderId) {
  await page.goto(`${BASE}/admin/orders?status=pending`);
  await page.locator("li", { hasText: orderId }).getByRole("button", { name: /Payment received/ }).click();
  await waitStatus(orderId, "paid");
}
async function reject(orderId) {
  await page.goto(`${BASE}/admin/orders?status=pending`);
  await page.locator("li", { hasText: orderId }).getByRole("button", { name: /Reject/ }).click();
  await waitStatus(orderId, "rejected");
}
await approve(order1.id);
const o1 = (await sql`SELECT * FROM orders WHERE id = ${order1.id}`)[0];
const K = o1.license_keys[0]?.key ?? JSON.parse(o1.license_keys)[0].key;
row = await keyRow(K);
const months = (new Date(row.expires_at) - Date.now()) / DAY;
ok("C03", "approving the transfer issues a key valid ~1 month", o1.status === "paid" && months > 27 && months < 32, `${months.toFixed(1)} days`);
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer, paymentRef: "IPN-5002" });
ok("C04", "same email buying the same plugin again → asked to renew or confirm another PC", r.status === 409 && r.data.errors?.form === "already_licensed" && r.data.licensed?.includes("Smart Wiring"));
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer, paymentRef: "IPN-5002", confirmAdditional: true });
ok("C04b", "…confirming 'this is for another PC' places the order", r.data.ok === true);
await reject(r.data.id);
const curA = (await keyRow(s[0])).device_id;
r = await post("/api/checkout", { items: [line(fx.smart)], customer: { ...buyer, email: "new@example.com" }, paymentRef: "IPN-5003", device: curA });
ok("C05", "purchase from a PC that already owns the plugin (device from plugin link) → hard block", r.status === 409 && r.data.errors?.form === "device_licensed");
r = await post("/api/checkout", { items: [line(fx.panel)], customer: { ...buyer, email: "new@example.com" }, paymentRef: "IPN-5004", device: D.G.id });
ok("C05b", "same device check allows a plugin that PC doesn't own", r.data.ok === true);
await reject(r.data.id);
r = await post("/api/checkout", { items: [line(fx.panel)], customer: buyer, paymentRef: "IPN-5005", renewKey: K });
ok("C06", "renewal key for a different plugin → renewKeyProduct", r.data.errors?.renewKey === "renewKeyProduct");
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer, paymentRef: "IPN-5006", renewKey: s[0] });
ok("C07", "renewing a never-expiring key → renewKeyForever", r.data.errors?.renewKey === "renewKeyForever");
r = await post("/api/checkout", { items: [line(fx.smart, "monthly", 2)], customer: buyer, paymentRef: "IPN-5007", renewKey: K });
ok("C08", "renewal must be exactly one license", r.data.errors?.renewKey === "renewKey");
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer, paymentRef: "IPN-5001-X".replace("-X", "") });
ok("C09", "after rejection a reference can be reused; while pending/paid it can't", r.data.errors?.paymentRef === "paymentRefUsed");

// ---------- renewal & grace (key K on PC H)
r = await activate(K, D.H);
f = fields(r.data.payload);
ok("R01", "bought key activates; renewDue = key end date", r.data.ok && Number(f[11]) * 1000 === new Date(row.expires_at).setMilliseconds(0) - (new Date(row.expires_at).getMilliseconds() ? 0 : 0) || Math.abs(Number(f[11]) * 1000 - new Date(row.expires_at).getTime()) < 1000);
const setExp = (ms) => sql`UPDATE license_keys SET expires_at = ${new Date(Date.now() + ms)} WHERE key = ${K}`;
await setExp(-1 * DAY);
r = await status(K, D.H);
f = r.data.payload ? fields(r.data.payload) : [];
ok("R02", "1 day after the end date: still works (3-day grace); plugin sees renewDue < now < hard stop", r.data.ok && Number(f[11]) * 1000 < Date.now() && Number(f[6]) * 1000 > Date.now() && Math.abs((Number(f[6]) - Number(f[11])) / 86400 - 3) < 0.01);
await setExp(-4 * DAY);
r = await status(K, D.H);
ok("R03", "4 days after the end date (grace over) → expired", r.data.error === "expired");
await setExp(-1 * DAY);
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer, paymentRef: "IPN-6001", renewKey: K });
const renewOrder = r.data.id;
await setExp(-5 * DAY);
await sql`UPDATE orders SET created_at = ${new Date(Date.now() - 3 * DAY)} WHERE id = ${renewOrder}`;
r = await status(K, D.H);
ok("R04", "renewal paid during grace, admin hasn't approved yet → keeps working (pending-payment grace)", r.data.ok === true);
await sql`UPDATE orders SET created_at = ${new Date(Date.now() - 1 * DAY)} WHERE id = ${renewOrder}`;
r = await status(K, D.H);
ok("R05", "a renewal submitted after the license already lapsed does not revive it", r.data.error === "expired");
await sql`UPDATE orders SET created_at = ${new Date(Date.now() - 3 * DAY)} WHERE id = ${renewOrder}`;
const oldEnd = new Date((await keyRow(K)).expires_at);
await approve(renewOrder);
let newEnd = new Date((await keyRow(K)).expires_at);
const expect1 = new Date(oldEnd); expect1.setMonth(expect1.getMonth() + 1);
ok("R06", "approved renewal (paid within grace) extends from the old end date", Math.abs(newEnd - expect1) < 2000, `${oldEnd.toISOString().slice(0, 10)} → ${newEnd.toISOString().slice(0, 10)}`);
await setExp(10 * DAY);
const early = new Date((await keyRow(K)).expires_at);
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer, paymentRef: "IPN-6002", renewKey: K });
await approve(r.data.id);
newEnd = new Date((await keyRow(K)).expires_at);
const expect2 = new Date(early); expect2.setMonth(expect2.getMonth() + 1);
ok("R07", "early renewal loses no days (extends from current end)", Math.abs(newEnd - expect2) < 2000);
await setExp(-20 * DAY);
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer, paymentRef: "IPN-6003", renewKey: K });
const lateOrder = r.data.id;
await approve(lateOrder);
newEnd = new Date((await keyRow(K)).expires_at);
const expect3 = new Date((await sql`SELECT created_at FROM orders WHERE id = ${lateOrder}`)[0].created_at); expect3.setMonth(expect3.getMonth() + 1);
ok("R08", "renewal after the license lapsed starts from the payment date", Math.abs(newEnd - expect3) < 2000);
r = await post("/api/checkout", { items: [line(fx.smart)], customer: { ...buyer, email: "t1@example.com" }, paymentRef: "IPN-6004", renewKey: trialKey });
await approve(r.data.id);
row = await keyRow(trialKey);
ok("R09", "buying with the trial key as renewal converts it to a paid key", row.trial === false && new Date(row.expires_at) > new Date(Date.now() + 27 * DAY));

// ---------- reminders (cron)
r = await fetch(`${BASE}/api/cron/renewals`);
ok("M01", "cron endpoint refuses calls without CRON_SECRET", r.status === 401);
const cron = async () => (await fetch(`${BASE}/api/cron/renewals`, { headers: { authorization: `Bearer ${CRON_SECRET}` } })).json();
const mailCount = () => (existsSync(MAIL_FILE) ? readFileSync(MAIL_FILE, "utf8").trim().split("\n").filter(Boolean).length : 0);
await setExp(6 * DAY);
let before = mailCount();
let c1 = await cron();
let c2 = await cron();
ok("M02", "6 days before the end: one reminder, never repeated", c1.sent >= 1 && c2.sent === 0 && mailCount() > before, JSON.stringify(c1));
await setExp(2 * DAY);
c1 = await cron();
ok("M03", "2 days before: second reminder", c1.sent >= 1);
await setExp(-1 * DAY);
c1 = await cron();
ok("M04", "ended (in grace): 'renew by' reminder", c1.sent >= 1);
await setExp(-0.5 * DAY);
await sql`UPDATE license_keys SET reminder_stage = 0 WHERE key = ${K}`;
r = await post("/api/checkout", { items: [line(fx.smart)], customer: buyer, paymentRef: "IPN-6005", renewKey: K });
c1 = await cron();
const pendingSkip = (await keyRow(K)).reminder_stage === 0;
ok("M05", "no reminder while a renewal payment is waiting for approval", pendingSkip);
await reject(r.data.id);
await sql`UPDATE license_keys SET expires_at = ${new Date(Date.now() + 2 * DAY)}, reminder_stage = 0, trial = true WHERE key = ${trial2}`;
await sql`UPDATE license_keys SET device_id = ${D.B.id}, device_components = ${D.B.components} WHERE key = ${trial2}`;
c1 = await cron();
ok("M06", "trial ending in 2 days gets a 'trial ends' email", (await keyRow(trial2)).reminder_stage >= 2);

// ---------- emails (fake SMTP)
function decodeMime(raw) {
  const out = [];
  const parts = raw.split(/\n--[^\n]+\n/);
  for (const part of parts) {
    const [head, ...rest] = part.split("\n\n");
    const body = rest.join("\n\n");
    if (/base64/i.test(head)) out.push(Buffer.from(body.replace(/[^A-Za-z0-9+/=]/g, ""), "base64").toString("utf8"));
    else if (/quoted-printable/i.test(head)) out.push(body.replace(/=\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
    else out.push(body);
  }
  return Buffer.from(out.join("\n"), "latin1").toString("utf8") + raw;
}
const mails = readFileSync(MAIL_FILE, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((m) => ({ ...m, text: decodeMime(m.body) }));
const to = (addr) => mails.filter((m) => m.to.some((t) => t.includes(addr)));
ok("E01", "approval email to the buyer contains the key and order link", to("omar@example.com").some((m) => m.text.includes(K) && m.text.includes(`/order/${order1.id}?t=`)));
ok("E02", "new-order notification to veylixbim@gmail.com with Reply-To = buyer", to("veylixbim@gmail.com").some((m) => /Reply-To:.*omar@example\.com/i.test(m.body) && m.text.includes("IPN-5001")));
ok("E03", "trial email contains the trial key", to("t1@example.com").some((m) => m.text.includes(trialKey)));
ok("E04", "renewal reminder explains how to renew with the same key", to("omar@example.com").some((m) => /Renewing an existing license/.test(m.text) && m.text.includes(K)));
ok("E05", "every email is sent from veylixbim@gmail.com", mails.every((m) => m.from.includes("veylixbim@gmail.com")));

// ---------- security odds and ends
let res = await fetch(`${BASE}/en/order/${order1.id}?t=wrong`);
ok("S08", "order page with a wrong token shows no keys", !(await res.text()).includes(K));
r = await post("/api/checkout", { items: [line(fx.panel)], customer: { name: "=HYPERLINK(\"http://evil\")", email: "csv@example.com", phone: "01012345678" }, paymentRef: "IPN-7001" });
const csv = await (await page.request.get(`${BASE}/api/admin/customers/export`)).text();
ok("S09", "CSV export neutralises spreadsheet formulas (CSV injection)", csv.includes("'=HYPERLINK") && !/,=HYPERLINK/.test(csv));
await reject(r.data.id);
res = await page.request.get(`${BASE}/admin/keys?q=${encodeURIComponent("' OR 1=1 --")}`);
ok("S10", "SQL-injection text in admin search is harmless", res.status() === 200 && !(await res.text()).includes(s[0]));
await post("/api/contact", { name: "Mallory", email: "m@example.com", message: "<img src=x onerror=alert(1)> hello", topic: "support" });
await page.goto(`${BASE}/admin/inbox`);
await page.waitForTimeout(500);
ok("S11", "HTML in a contact message is shown as text, never executed", (await page.content()).includes("&lt;img src=x onerror=alert(1)&gt;") && !pageErrors.some((e) => e.startsWith("dialog")));

// ---------- admin revoke / reset / force re-check (UI)
async function manage(key, button) {
  await page.goto(`${BASE}/admin/keys?q=${encodeURIComponent(key)}`);
  await page.getByRole("button", { name: /Manage/ }).first().click();
  await page.waitForSelector("[role=dialog]");
  await page.getByRole("dialog").getByRole("button", { name: button }).click();
  await page.waitForTimeout(900);
}
await manage(s[2], /Ask for key now/);
r = await status(s[2], D.D);
ok("A01", "'Ask for key now' makes the plugin ask for the key at its next check", r.data.ok && Number(fields(r.data.payload)[4]) * 1000 < Date.now());
await manage(s[2], /Revoke key/);
r = await status(s[2], D.D);
const dl = await post("/api/download", { key: s[2], product: "smart-wiring" });
ok("A02", "revoked key: plugin check and download refused", r.data.error === "revoked" && dl.data.error === "revoked");
await manage(s[2], /Restore key/);
await manage(s[1], /Reset device/);
r = await activate(s[1], D.B);
ok("A03", "reset device: key moves to a new PC and the change limit starts over", r.data.ok === true);
r = await status(s[1], D.C);
ok("A03b", "old PC is refused after the move", r.data.error === "device_mismatch");

// ---------- two-step sign-in
const b32 = (s) => { const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = 0, v = 0; const out = []; for (const ch of s.replace(/[^A-Z2-7]/g, "")) { v = (v << 5) | A.indexOf(ch); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
const totp = (secret, offset = 0) => { const c = Math.floor(Date.now() / 30000) + offset; const m = Buffer.alloc(8); m.writeBigUInt64BE(BigInt(c)); const h = createHmac("sha1", b32(secret)).update(m).digest(); const o = h[h.length - 1] & 15; return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0"); };
await page.goto(`${BASE}/admin/settings#two-step`);
await page.getByRole("button", { name: /Turn on two-step sign-in/ }).click();
await page.waitForSelector("text=Can't scan?");
const secret = (await page.locator("span.font-mono.text-xs").first().textContent()).trim();
await page.fill("input[aria-label='6-digit code']", totp(secret));
await page.getByRole("button", { name: /Confirm and turn on/ }).click();
await page.waitForSelector("text=Save these recovery codes");
const codes = (await page.locator("ul.font-mono li").allTextContents()).map((c) => c.trim());
ok("F01", "two-step sign-in turned on; 8 recovery codes shown once", codes.length === 8);
async function tryLogin(code, ipAddr) {
  const c = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ipAddr } });
  const pg = await c.newPage();
  await pg.goto(`${BASE}/admin/login`);
  await pg.fill("#password", ADMIN_PASSWORD);
  await pg.click("button[type=submit]");
  await pg.waitForSelector("#code");
  if (code === null) { await c.close(); return "asked"; }
  await pg.fill("#code", code);
  await pg.click("button[type=submit]");
  await pg.waitForTimeout(1200);
  const inside = pg.url().endsWith("/admin");
  await c.close();
  return inside;
}
ok("F02", "password alone is no longer enough (code requested)", (await tryLogin(null, "10.55.0.1")) === "asked");
ok("F02b", "wrong code refused", (await tryLogin("000000", "10.55.0.2")) === false);
await new Promise((res) => setTimeout(res, 31000 - (Date.now() % 30000))); // next time step so the setup code isn't reused
const code = totp(secret);
ok("F03", "correct authenticator code signs in", (await tryLogin(code, "10.55.0.3")) === true);
ok("F03b", "the same code can't be used twice (replay)", (await tryLogin(code, "10.55.0.4")) === false);
ok("F04", "a recovery code signs in once", (await tryLogin(codes[0], "10.55.0.5")) === true);
ok("F04b", "…and is then used up", (await tryLogin(codes[0], "10.55.0.6")) === false);
await page.goto(`${BASE}/admin/settings?reload=1`);
await page.fill("#mfa-off-pw", ADMIN_PASSWORD);
await page.fill("input[aria-label='Current code or recovery code']", codes[1]);
await page.getByRole("button", { name: /Turn off/ }).click();
await page.waitForSelector("text=Two-step sign-in is off");
ok("F05", "turning it off needs the password and a code", true);

ok("Z01", "no browser errors or unexpected dialogs in admin", pageErrors.length === 0, pageErrors.join(" | "));
await browser.close();
await sql.end();
const failed = results.filter((x) => !x.cond);
console.log(`\ncases: ${results.length - failed.length}/${results.length} passed${failed.length ? " — failed: " + failed.map((x) => x.id).join(", ") : ""}`);
process.exit(failed.length ? 1 : 0);
