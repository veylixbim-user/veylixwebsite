import "server-only";
import { randomBytes } from "node:crypto";

// Crockford-style alphabet: no 0/O/1/I/L ambiguity when keys are read aloud or typed.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomString(length: number) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function licenseKey(prefix = "VLX") {
  return [prefix, randomString(4), randomString(4), randomString(4), randomString(4)].join("-");
}

export function orderId() {
  return `VX-${Date.now().toString(36).toUpperCase()}-${randomString(4)}`;
}

export function invoiceNumber() {
  const year = new Date().getFullYear();
  return `INV-${year}-${randomBytes(3).readUIntBE(0, 3).toString().padStart(7, "0")}`;
}

export function fawryReference() {
  return randomBytes(4).readUInt32BE(0).toString().padStart(10, "9").slice(0, 10);
}
