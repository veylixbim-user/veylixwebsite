import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { query } from "./db";
import { getSetting, setSetting } from "./settings";

/**
 * Two-step sign-in for the admin panel: RFC 6238 time-based codes (Google Authenticator, Microsoft
 * Authenticator, 1Password…) plus single-use recovery codes. Break-glass: set ADMIN_MFA_DISABLED=1 in the
 * hosting environment to sign in with the password only (then turn two-step sign-in off and on again).
 */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP = 30;
const ISSUER = "VEYLIX";

function base32Encode(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string) {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", secret).update(msg).digest();
  const offset = mac[mac.length - 1] & 0xf;
  const bin = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return bin.toString().padStart(6, "0");
}

/** Returns the matching time step, or null. Accepts ±1 step (30 s) of clock drift. */
function matchStep(secretB32: string, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretB32);
  const t = Math.floor(now / 1000 / STEP);
  for (const step of [t, t - 1, t + 1]) {
    const expected = hotp(secret, step);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return step;
  }
  return null;
}

export function mfaBypassed() {
  return process.env.ADMIN_MFA_DISABLED === "1" || process.env.ADMIN_MFA_DISABLED === "true";
}

export async function mfaEnabled() {
  return !mfaBypassed() && Boolean(await getSetting("admin_totp_secret"));
}

const hashCode = (c: string) => createHash("sha256").update(`vx-recovery|${c.replace(/[^A-Z0-9]/gi, "").toUpperCase()}`).digest("hex");

/**
 * Verifies a 6-digit code (each code works once) or a recovery code (consumed on use).
 * Returns what was used, or null.
 */
export async function verifyMfa(input: string): Promise<"totp" | "recovery" | null> {
  const secret = await getSetting("admin_totp_secret");
  if (!secret) return null;
  const code = input.replace(/\s+/g, "");
  if (/^\d{6}$/.test(code)) {
    const step = matchStep(secret, code);
    if (step === null) return null;
    // Replay protection: a code (time step) can't be used twice.
    const last = Number((await getSetting("admin_totp_last_step")) ?? 0);
    if (step <= last) return null;
    await setSetting("admin_totp_last_step", String(step));
    return "totp";
  }
  const hashes = JSON.parse((await getSetting("admin_recovery_codes")) ?? "[]") as string[];
  const h = hashCode(code);
  if (!hashes.includes(h)) return null;
  await setSetting("admin_recovery_codes", JSON.stringify(hashes.filter((x) => x !== h)));
  return "recovery";
}

export async function recoveryCodesLeft() {
  return (JSON.parse((await getSetting("admin_recovery_codes")) ?? "[]") as string[]).length;
}

/** Starts setup: stores a pending secret and returns what the authenticator app needs. */
export async function beginMfaSetup() {
  const secret = base32Encode(randomBytes(20));
  await setSetting("admin_totp_pending", secret);
  const uri = `otpauth://totp/${ISSUER}:admin?secret=${secret}&issuer=${ISSUER}&algorithm=SHA1&digits=6&period=${STEP}`;
  const { toString } = await import("qrcode");
  const qrSvg = await toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  return { secret, uri, qrSvg };
}

function newRecoveryCodes() {
  return Array.from({ length: 8 }, () => {
    const raw = base32Encode(randomBytes(8)).slice(0, 10);
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

/** Confirms setup with a code from the app. Returns the recovery codes (shown once) or null. */
export async function confirmMfaSetup(code: string): Promise<string[] | null> {
  const pending = await getSetting("admin_totp_pending");
  if (!pending) return null;
  const step = matchStep(pending, code.replace(/\s+/g, ""));
  if (step === null) return null;
  const codes = newRecoveryCodes();
  await setSetting("admin_totp_secret", pending);
  await setSetting("admin_totp_last_step", String(step));
  await setSetting("admin_recovery_codes", JSON.stringify(codes.map(hashCode)));
  await query("DELETE FROM settings WHERE key = 'admin_totp_pending'");
  return codes;
}

export async function regenerateRecoveryCodes() {
  const codes = newRecoveryCodes();
  await setSetting("admin_recovery_codes", JSON.stringify(codes.map(hashCode)));
  return codes;
}

export async function disableMfa() {
  await query("DELETE FROM settings WHERE key IN ('admin_totp_secret', 'admin_totp_pending', 'admin_recovery_codes', 'admin_totp_last_step')");
}

/** Exposed for tests. */
export const __totp = { hotp, base32Decode, base32Encode };
