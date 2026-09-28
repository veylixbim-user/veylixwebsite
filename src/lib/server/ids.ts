import "server-only";
import { randomBytes } from "node:crypto";

// Unambiguous alphabet (no 0/O/1/I/L) — keys are read aloud and typed by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomString(length: number, alphabet = ALPHABET) {
  // Rejection sampling keeps the distribution uniform.
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < limit) out += alphabet[byte % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}

/** VLX-XXXX-XXXX-XXXX-XXXX (16 random symbols ≈ 79 bits). */
export function licenseKey() {
  const s = randomString(16);
  return `VLX-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

export function orderId() {
  return `VX-${Date.now().toString(36).toUpperCase()}-${randomString(4)}`;
}

export function accessToken() {
  return randomBytes(18).toString("base64url");
}

export function invoiceNumber() {
  return `INV-${new Date().getFullYear()}-${randomString(6, "0123456789")}`;
}

export function productId() {
  return `p_${randomString(12, "abcdefghijkmnpqrstuvwxyz23456789")}`;
}

/** Normalizes user-typed keys: uppercase, strip spaces, restore dashes. */
export function normalizeKey(input: string) {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("VLX") ? raw.slice(3) : raw;
  if (body.length !== 16) return input.trim().toUpperCase();
  return `VLX-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}`;
}
