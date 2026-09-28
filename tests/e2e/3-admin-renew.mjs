// Admin "Renew" button (Manage key → Renew +1 month / +1 year). Run after 1-setup.cjs on a fresh database.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { onnotice: () => {} });
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.env.E2E_OUT || new URL(".out", import.meta.url).pathname;
const fx = JSON.parse(readFileSync(`${OUT}/fixtures.json`, "utf8"));
const DAY = 86400000;
const ok = (id, l, c, x = "") => console.log(`${c ? "PASS" : "FAIL"}  ${id} ${l}${x ? "  — " + x : ""}`);
const b = await chromium.launch();
const ctx = await b.newContext({ storageState: `${OUT}/state.json`, extraHTTPHeaders: { "x-forwarded-for": "10.66.0.2" } });
const page = await ctx.newPage();
async function renew(key, period) {
  await page.goto(`${BASE}/admin/keys?q=${key}`);
  await page.getByRole("button", { name: /Manage/ }).first().click();
  await page.waitForSelector("[role=dialog]");
  await page.selectOption("select[name=period]", period);
  await page.getByRole("dialog").getByRole("button", { name: /^Renew$/ }).click();
  await page.waitForSelector("[role=dialog] >> text=/Renewed until|never expires|revoked/", { timeout: 15000 });
  return page.getByRole("dialog").locator("text=/Renewed until|never expires|revoked/").first().textContent();
}
const [k1, k2, k3, k4] = fx.smartKeys;
const set = (k, v) => sql`UPDATE license_keys SET expires_at = ${v}, assigned_to = 'buyer@example.com' WHERE key = ${k}`;
const endOf = async (k) => new Date((await sql`SELECT expires_at FROM license_keys WHERE key = ${k}`)[0].expires_at);
const addM = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };

const e1 = new Date(Date.now() + 10 * DAY); await set(k1, e1);
await renew(k1, "monthly");
ok("AR1", "active key +1 month extends from its end date", Math.abs((await endOf(k1)) - addM(e1, 1)) < 1500);
const e2 = new Date(Date.now() - 2 * DAY); await set(k2, e2);
await renew(k2, "yearly");
ok("AR2", "key in grace +1 year extends from its old end date", Math.abs((await endOf(k2)) - addM(e2, 12)) < 1500);
const e3 = new Date(Date.now() - 20 * DAY); await set(k3, e3);
const before = Date.now(); await renew(k3, "monthly");
ok("AR3", "lapsed key +1 month starts today", Math.abs((await endOf(k3)) - addM(new Date(before), 1)) < 60000);
await sql`UPDATE license_keys SET trial = true, expires_at = ${new Date(Date.now() + DAY)} WHERE key = ${k4}`;
await renew(k4, "monthly");
const r4 = (await sql`SELECT trial FROM license_keys WHERE key = ${k4}`)[0];
ok("AR4", "renewing a trial key makes it a paid key", r4.trial === false);
const msg = await renew(fx.universal[0], "monthly");
ok("AR5", "never-expiring key: nothing to renew", /never expires/.test(msg), msg);
const mails = readFileSync(`${OUT}/mail.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
ok("AR6", "customer is emailed about the renewal", mails.some((m) => m.to.some((t) => t.includes("buyer@example.com")) && /renewed/i.test(m.body)));
const act = (await sql`SELECT count(*)::int n FROM activity WHERE kind = 'key:renew'`)[0].n;
ok("AR7", "renewals are logged in the activity feed", act === 4, `${act}`);
await b.close(); await sql.end();
