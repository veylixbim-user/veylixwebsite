import "server-only";
import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "./db";
import { getSetting, setSetting } from "./settings";
import { mfaEnabled, verifyMfa } from "./totp";
import { logSecurity } from "./security-log";
import { notifyInbox } from "./mail";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

// "__Host-" cookies can only be set over HTTPS, for this exact host and path — no subdomain can overwrite them.
export const ADMIN_COOKIE = process.env.NODE_ENV === "production" ? "__Host-vx_admin" : "vx_admin";
const SESSION_HOURS = 12;
const IDLE_MINUTES = 120;
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
  await query("UPDATE admin_sessions SET revoked = true WHERE NOT revoked");
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

/**
 * Sessions live in the database: the cookie holds a random 256-bit id and only its SHA-256 is stored. The owner can see
 * every signed-in device and end any of them; a stolen cookie stops working when it is revoked, after 12 hours, or after
 * 2 hours without use.
 */
const hashId = (id: string) => createHash("sha256").update(id).digest("hex");

async function createSession(ip: string, agent: string) {
  const id = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 3_600_000);
  await query("INSERT INTO admin_sessions (id, expires_at, ip, user_agent) VALUES ($1, $2, $3, $4)", [hashId(id), expires, ip, agent.slice(0, 200)]);
  await query("DELETE FROM admin_sessions WHERE expires_at < now() - interval '7 days'");
  return { id, expires };
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
  const session = await createSession(ip, agent);
  const store = await cookies();
  store.set(ADMIN_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: session.expires,
  });
  return { ok: true };
}

export async function logout() {
  const store = await cookies();
  const id = store.get(ADMIN_COOKIE)?.value;
  if (id) await query("UPDATE admin_sessions SET revoked = true WHERE id = $1", [hashId(id)]).catch(() => undefined);
  store.delete(ADMIN_COOKIE);
}

export async function isAdmin() {
  const id = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!id || id.length > 100) return false;
  try {
    const rows = await query<{ last_seen_at: Date }>(
      "SELECT last_seen_at FROM admin_sessions WHERE id = $1 AND NOT revoked AND expires_at > now() AND last_seen_at > now() - make_interval(mins => $2)",
      [hashId(id), IDLE_MINUTES],
    );
    if (!rows[0]) return false;
    if (Date.now() - new Date(rows[0].last_seen_at).getTime() > 60_000) await query("UPDATE admin_sessions SET last_seen_at = now() WHERE id = $1", [hashId(id)]);
    return true;
  } catch {
    return false;
  }
}

export type AdminSession = { key: string; createdAt: string; lastSeenAt: string; ip: string | null; agent: string | null; current: boolean };

/** Signed-in devices, newest first. `key` is the stored hash (never the cookie value) and is what "end session" refers to. */
export async function listAdminSessions(): Promise<AdminSession[]> {
  const id = (await cookies()).get(ADMIN_COOKIE)?.value;
  const mine = id ? hashId(id) : "";
  const rows = await query<{ id: string; created_at: Date; last_seen_at: Date; ip: string | null; user_agent: string | null }>(
    `SELECT id, created_at, last_seen_at, ip, user_agent FROM admin_sessions
     WHERE NOT revoked AND expires_at > now() AND last_seen_at > now() - make_interval(mins => $1) ORDER BY created_at DESC LIMIT 50`,
    [IDLE_MINUTES],
  );
  return rows.map((r) => ({ key: r.id, createdAt: new Date(r.created_at).toISOString(), lastSeenAt: new Date(r.last_seen_at).toISOString(), ip: r.ip, agent: r.user_agent, current: r.id === mine }));
}

/** Ends one session (by its stored hash), or with "others" every session except the one making the request. */
export async function revokeAdminSessions(target: string) {
  const id = (await cookies()).get(ADMIN_COOKIE)?.value;
  const mine = id ? hashId(id) : "";
  if (target === "others") await query("UPDATE admin_sessions SET revoked = true WHERE NOT revoked AND id <> $1", [mine]);
  else if (/^[0-9a-f]{64}$/.test(target)) await query("UPDATE admin_sessions SET revoked = true WHERE id = $1", [target]);
  await logSecurity("admin_session_revoked", target === "others" ? "all other devices" : "one device", await clientIp());
}

/** Use at the top of every admin page, server action and admin API route. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}
