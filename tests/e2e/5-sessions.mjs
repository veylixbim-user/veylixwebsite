// Admin sessions: stored on the server, listed, revocable, expiring. Run after 1-setup.cjs (same database).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const postgres = require("postgres");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test-admin-pass-123";
const sql = postgres(process.env.DATABASE_URL, { onnotice: () => {} });
const results = [];
const ok = (id, label, cond, extra = "") => { results.push(cond); console.log(`${cond ? "PASS" : "FAIL"}  ${id} ${label}${extra ? "  — " + extra : ""}`); };

const browser = await chromium.launch();
async function signIn(ipTail) {
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `10.55.0.${ipTail}` } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/login`);
  await page.fill("#password", ADMIN_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASE}/admin`);
  return { ctx, page };
}
const cookieOf = async (ctx) => (await ctx.cookies()).find((c) => c.name.includes("vx_admin"));
const adminStatus = (cookie) => fetch(`${BASE}/admin`, { redirect: "manual", headers: cookie ? { cookie: `${cookie.name}=${cookie.value}` } : {} }).then((r) => r.status);
const live = async () => (await sql`SELECT count(*)::int n FROM admin_sessions WHERE NOT revoked AND expires_at > now()`)[0].n;

const A = await signIn(11);
const B = await signIn(12);
const ca = await cookieOf(A.ctx);
const cb = await cookieOf(B.ctx);
ok("SS01", "the cookie holds a random id (not a signed timestamp); only its hash is stored", ca.value.length >= 40 && !ca.value.includes(".") && (await sql`SELECT count(*)::int n FROM admin_sessions WHERE id = ${ca.value}`)[0].n === 0 && (await live()) >= 2);
ok("SS01b", "the cookie is still __Host-, HttpOnly, Secure, SameSite=Strict", ca.name === "__Host-vx_admin" && ca.httpOnly && ca.secure && ca.sameSite === "Strict");

await A.page.goto(`${BASE}/admin/settings`);
ok("SS02", "Settings lists the signed-in devices and marks this one", (await A.page.locator("text=Signed-in devices").count()) === 1 && (await A.page.locator("text=this device").count()) === 1 && (await A.page.locator("button:has-text('End session')").count()) >= 1);
ok("SS03", "a made-up cookie is not accepted", (await adminStatus({ name: ca.name, value: "A".repeat(43) })) >= 300);
ok("SS04", "a real cookie is accepted", (await adminStatus(cb)) === 200);

await A.page.getByRole("button", { name: /Sign out all other devices/ }).click();
await A.page.waitForFunction(() => !document.body.innerText.includes("Sign out all other devices"), null, { timeout: 15000 });
ok("SS05", "“Sign out all other devices” ends the other session at once and keeps this one", (await adminStatus(cb)) >= 300 && (await adminStatus(ca)) === 200);
ok("SS06", "the revocation is in the security log", (await sql`SELECT count(*)::int n FROM security_events WHERE kind = 'admin_session_revoked'`)[0].n >= 1);

const E = await signIn(15);
const ce = await cookieOf(E.ctx);
await A.page.goto(`${BASE}/admin/settings`);
await A.page.locator("li", { hasText: "10.55.0.15" }).getByRole("button", { name: /End session/ }).click();
await A.page.waitForFunction(() => !document.body.innerText.includes("10.55.0.15"), null, { timeout: 15000 });
ok("SS07", "“End session” on one device ends just that device", (await adminStatus(ce)) >= 300 && (await adminStatus(ca)) === 200);

await sql`UPDATE admin_sessions SET last_seen_at = now() - interval '3 hours' WHERE NOT revoked`;
ok("SS08", "a session unused for 3 hours is no longer valid", (await adminStatus(ca)) >= 300);

const C = await signIn(13);
const cc = await cookieOf(C.ctx);
await C.page.getByRole("button", { name: /Sign out/ }).first().click();
await C.page.waitForURL(/\/admin\/login/);
ok("SS09", "signing out ends the session on the server, not just in the browser", (await adminStatus(cc)) >= 300);

const D = await signIn(14);
const cd = await cookieOf(D.ctx);
await sql`UPDATE admin_sessions SET expires_at = now() - interval '1 minute' WHERE NOT revoked`;
ok("SS10", "a session past its 12-hour limit is refused", (await adminStatus(cd)) >= 300);

await browser.close();
await sql.end();
const failed = results.filter((x) => !x).length;
console.log(`\nsessions: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
