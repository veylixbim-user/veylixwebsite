const fs = require("fs");
const { chromium } = require("playwright");
const path = require("path");
const HERE = __dirname;
const OUT = process.env.E2E_OUT || path.join(HERE, ".out");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test-admin-pass-123";
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (label, cond, extra = "") => { results.push(cond); console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`); };

(async () => {
  const b = await chromium.launch();
  // --- unauthenticated access
  let r = await fetch(BASE + "/admin", { redirect: "manual" });
  ok("S01 /admin without session redirects to login", [302, 303, 307].includes(r.status) && /\/admin\/login/.test(r.headers.get("location") || ""), `${r.status}`);
  for (const path of ["/api/admin/keys/export", "/api/admin/customers/export", "/api/admin/plugin-kit/p_x"]) {
    r = await fetch(BASE + path);
    ok(`S02 ${path} blocked without session`, r.status === 401, `${r.status}`);
  }
  r = await fetch(BASE + "/api/admin/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname: "x.zip" } }) });
  ok("S03 upload token refused without session", r.status >= 400, `${r.status}`);
  r = await fetch(BASE + "/en");
  const csp = r.headers.get("content-security-policy") || "";
  ok("S04 CSP with frame-ancestors none + object-src none", csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'"));
  ok("S05 HSTS + nosniff + DENY", !!r.headers.get("strict-transport-security") && r.headers.get("x-content-type-options") === "nosniff" && r.headers.get("x-frame-options") === "DENY");

  // --- lockout (own IP)
  const lockCtx = await b.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.66.0.1" } });
  const lp = await lockCtx.newPage();
  await lp.goto(BASE + "/admin/login");
  for (let i = 0; i < 5; i++) {
    await lp.fill("#password", "wrong-" + i);
    await lp.click("button[type=submit]");
    await lp.waitForSelector("[role=alert]");
  }
  await lp.fill("#password", ADMIN_PASSWORD);
  await lp.click("button[type=submit]");
  await lp.waitForTimeout(800);
  ok("S06 5 wrong passwords lock the IP (even the right password is refused)", /Too many attempts/.test(await lp.textContent("[role=alert]")));
  await lockCtx.close();

  // --- real login
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, extraHTTPHeaders: { "x-forwarded-for": "10.66.0.2" } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(BASE + "/admin/login");
  await p.fill("#password", ADMIN_PASSWORD);
  await p.click("button[type=submit]");
  await p.waitForURL(BASE + "/admin");
  const cookies = await ctx.cookies();
  const c = cookies.find((x) => x.name.includes("vx_admin"));
  ok("S07 admin cookie is __Host-, HttpOnly, Secure, SameSite=Strict", c && c.name === "__Host-vx_admin" && c.httpOnly && c.secure && c.sameSite === "Strict", c ? `${c.name} ${c.sameSite}` : "none");

  // --- products
  async function createProduct({ name, slug, monthly, yearly, installer }) {
    await p.goto(BASE + "/admin/products/new");
    await p.fill("#name", name);
    await p.fill("#slug", slug);
    await p.fill("#version", "1.0.0");
    await p.fill("#taglineEn", `${name} for Revit`);
    await p.fill("#priceMonthly", String(monthly));
    await p.fill("#priceYearly", String(yearly));
    if (installer === "folder") {
      await p.setInputFiles("input[webkitdirectory]", path.join(HERE, "fixtures") + "/Smart Wiring Addin");
      await p.waitForSelector("text=choose what customers receive");
      await p.click('button:has-text("Zip & upload")');
    } else {
      await p.setInputFiles('input[type=file][accept^=".zip"]', installer);
    }
    await p.waitForSelector("section:has(h2:text('Plugin installer')) .truncate", { timeout: 30000 });
    await p.check("input[name=published]");
    await p.click('button:has-text("Create product")');
    await p.waitForURL(/\/admin\/products\/p_/);
    return p.url().split("/").pop().split("?")[0];
  }
  const smart = await createProduct({ name: "Smart Wiring", slug: "smart-wiring", monthly: 1499, yearly: 14399, installer: "folder" });
  const panel = await createProduct({ name: "Panel Pro", slug: "panel-pro", monthly: 999, yearly: 9599, installer: path.join(HERE, "fixtures") + "/panel-pro.zip" });
  ok("P01 two products created", smart.startsWith("p_") && panel.startsWith("p_"), `${smart} ${panel}`);

  // --- generate paid keys
  async function gen(count, product, note) {
    await p.goto(BASE + "/admin/keys");
    await p.click('button:has-text("Generate keys")');
    await p.fill("#gk-count", String(count));
    await p.selectOption("#gk-product", { label: product });
    await p.fill("#gk-note", note);
    await p.click('form button[type=submit]:has-text("Generate")');
    await p.waitForSelector(`text=${count} keys generated.`);
    await p.keyboard.press("Escape");
    await p.goto(BASE + "/admin/keys?q=" + encodeURIComponent(note));
    return (await p.locator("tbody td.font-mono").allTextContents()).map((k) => k.replace(/Copy$/, "").trim());
  }
  const smartKeys = await gen(8, "Smart Wiring", "suite-smart");
  const panelKeys = await gen(2, "Panel Pro", "suite-panel");
  await p.goto(BASE + "/admin/keys?product=universal");
  const universal = (await p.locator("tbody td.font-mono").allTextContents()).map((k) => k.replace(/Copy$/, "").trim()).slice(0, 3);
  ok("P02 keys generated (8 Smart Wiring, 2 Panel Pro) and seed pool present", smartKeys.length === 8 && panelKeys.length === 2 && universal.length === 3);

  // --- settings: 30-day check, 10-day trial, 3-day grace
  await p.goto(BASE + "/admin/settings");
  await p.fill("#activationDays", "30");
  await p.fill("#trialDays", "10");
  await p.fill("#renewalGraceDays", "3");
  await p.click('button:has-text("Save settings")');
  await p.waitForSelector("text=Settings saved");
  ok("P03 settings saved (check 30d, trial 10d, grace 3d)", true);

  fs.writeFileSync(path.join(OUT, "state.json"), JSON.stringify(await ctx.storageState()));
  fs.writeFileSync(path.join(OUT, "fixtures.json"), JSON.stringify({ smart, panel, smartKeys, panelKeys, universal }, null, 2));
  ok("P04 no browser errors during setup", errors.length === 0, errors.join(" | "));
  await b.close();
  const failed = results.filter((x) => !x).length;
  console.log(`\nsetup: ${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
