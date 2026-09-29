import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "./db";
import { getSetting, sessionSecret, setSetting } from "./settings";
import { mfaEnabled, verifyMfa } from "./totp";
import { logSecurity } from "./security-log";
import { notifyInbox } from "./mail";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

// "__Host-" cookies can only be set over HTTPS, for this exact host and path — no subdomain can overwrite them.
export const ADMIN_COOKIE = process.env.NODE_ENV === "production" ? "__Host-vx_admin" : "vx_admin";
const SESSION_HOURS = 12;
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const N = 32768;
  const hash = await scrypt(password, salt, 64, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyHash(password: string, stored: string) {
  const [alg, N, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(actual, expected);
}

function safeEqual(a: string, b: string) {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** A password set from the admin panel wins; otherwise the ADMIN_PASSWORD environment variable. */
export async function passwordConfigured() {
  return Boolean((await getSetting("admin_password_hash")) || process.env.ADMIN_PASSWORD);
}

export async function checkPassword(password: string) {
  const stored = await getSetting("admin_password_hash");
  if (stored) return verifyHash(password, stored);
  const env = process.env.ADMIN_PASSWORD;
  return env ? safeEqual(password, env) : false;
}

export async function changePassword(current: string, next: string) {
  if (!(await checkPassword(current))) return { ok: false as const, error: "Current password is incorrect." };
  if (next.length < 10) return { ok: false as const, error: "Use at least 10 characters." };
  await setSetting("admin_password_hash", await hashPassword(next));
  // Invalidate every existing session.
  await setSetting("session_version", randomBytes(6).toString("hex"));
  return { ok: true as const };
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim().slice(0, 64);
}

async function lockedUntil(ip: string) {
  const rows = await query<{ locked_until: Date | null }>("SELECT locked_until FROM login_attempts WHERE ip = $1", [ip]);
  const until = rows[0]?.locked_until ? new Date(rows[0].locked_until) : null;
  return until && until.getTime() > Date.now() ? until : null;
}

async function recordFailure(ip: string) {
  await query(
    `INSERT INTO login_attempts (ip, failures, first_failure_at) VALUES ($1, 1, now())
     ON CONFLICT (ip) DO UPDATE SET
       failures = CASE WHEN login_attempts.first_failure_at < now() - interval '${LOCK_MINUTES} minutes' THEN 1 ELSE login_attempts.failures + 1 END,
       first_failure_at = CASE WHEN login_attempts.first_failure_at < now() - interval '${LOCK_MINUTES} minutes' THEN now() ELSE login_attempts.first_failure_at END`,
    [ip],
  );
  await query(`UPDATE login_attempts SET locked_until = now() + interval '${LOCK_MINUTES} minutes' WHERE ip = $1 AND failures >= ${MAX_FAILURES}`, [ip]);
}

async function sessionKey() {
  return `${await sessionSecret()}:${(await getSetting("session_version")) ?? "0"}`;
}

function signSession(expires: number, key: string) {
  return createHmac("sha256", key).update(`admin.${expires}`).digest("base64url");
}

export async function login(password: string, code?: string): Promise<{ ok: true } | { ok: false; error?: string; needCode?: boolean }> {
  const ip = await clientIp();
  const locked = await lockedUntil(ip);
  if (locked) {
    await logSecurity("admin_lockout", "sign-in attempt while locked", ip);
    return { ok: false, error: `Too many attempts. Try again after ${locked.toISOString().slice(11, 16)} UTC.` };
  }
  if (!(await passwordConfigured())) return { ok: false, error: "Admin password is not set. Add ADMIN_PASSWORD in your hosting environment variables." };
  if (!(await checkPassword(password))) {
    await recordFailure(ip);
    await logSecurity("admin_login_failed", "wrong password", ip);
    return { ok: false, error: "Wrong password." };
  }
  if (await mfaEnabled()) {
    if (!code?.trim()) return { ok: false, needCode: true };
    if (!(await verifyMfa(code))) {
      await recordFailure(ip); // wrong codes count towards the same lockout
      await logSecurity("admin_login_failed", "wrong two-step code", ip);
      return { ok: false, needCode: true, error: "That code didn't work. Use the current 6-digit code from your authenticator app, or a recovery code." };
    }
  }
  await query("DELETE FROM login_attempts WHERE ip = $1", [ip]);
  await logSecurity("admin_login", "signed in", ip);
  // Tell the owner about every admin sign-in, so a stolen password is noticed the first time it is used.
  const agent = ((await headers()).get("user-agent") ?? "unknown").slice(0, 160);
  notifyInbox("VEYLIX admin sign-in", `Someone signed in to the admin panel.\n\nTime: ${new Date().toISOString()}\nAddress: ${ip}\nBrowser: ${agent}\n\nIf this was not you, change the admin password now (Admin → Settings) and turn on two-step sign-in.`).catch(() => undefined);
  const expires = Date.now() + SESSION_HOURS * 3_600_000;
  const store = await cookies();
  store.set(ADMIN_COOKIE, `${expires}.${signSession(expires, await sessionKey())}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expires),
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin() {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  const expires = Number(exp);
  if (!expires || expires < Date.now() || !sig) return false;
  try {
    const expected = signSession(expires, await sessionKey());
    return expected.length === sig.length && timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

/** Use at the top of every admin page, server action and admin API route. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}
