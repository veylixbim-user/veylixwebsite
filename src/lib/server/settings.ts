import "server-only";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { query } from "./db";

export type PublicSettings = {
  activationDays: number;
  trialDays: number;
  /** Days a paid key keeps working after its end date, so a late renewal doesn't cut the user off. */
  renewalGraceDays: number;
  trialsEnabled: boolean;
  instapayNumber: string;
  instapayName: string;
  /** Optional InstaPay payment link (https://ipn.eg/…) shown as a button and QR code at checkout. */
  instapayLink: string;
  vatRate: number;
  /** Offer "InstaPay transfer" (manual check by the admin). */
  manualPaymentsEnabled: boolean;
  /** Offer online payment through Paymob (only takes effect once the Paymob keys are set in the hosting environment). */
  onlinePaymentsEnabled: boolean;
  /** Paymob integration IDs per payment method (numbers from Paymob → Settings → Payment Integrations; several may be listed, separated by commas). */
  paymob: { card: string; wallet: string; instapay: string; kiosk: string; installments: string };
};

export const DEFAULT_SETTINGS: PublicSettings = {
  activationDays: 30,
  trialDays: 14,
  renewalGraceDays: 3,
  trialsEnabled: true,
  instapayNumber: "01100444395",
  instapayName: "",
  instapayLink: "",
  vatRate: 14,
  manualPaymentsEnabled: true,
  onlinePaymentsEnabled: true,
  paymob: { card: "", wallet: "", instapay: "", kiosk: "", installments: "" },
};

async function readAll(): Promise<Map<string, string>> {
  const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings");
  return new Map(rows.map((r) => [r.key, r.value]));
}

function toInt(value: string | undefined, fallback: number, min: number, max: number) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export async function getSettings(): Promise<PublicSettings> {
  const map = await readAll();
  return {
    activationDays: toInt(map.get("activation_days"), DEFAULT_SETTINGS.activationDays, 1, 3650),
    trialDays: toInt(map.get("trial_days"), DEFAULT_SETTINGS.trialDays, 1, 365),
    renewalGraceDays: toInt(map.get("renewal_grace_days"), DEFAULT_SETTINGS.renewalGraceDays, 0, 30),
    trialsEnabled: (map.get("trials_enabled") ?? "1") === "1",
    instapayNumber: map.get("instapay_number") ?? DEFAULT_SETTINGS.instapayNumber,
    instapayName: map.get("instapay_name") ?? DEFAULT_SETTINGS.instapayName,
    instapayLink: map.get("instapay_link") ?? DEFAULT_SETTINGS.instapayLink,
    vatRate: toInt(map.get("vat_rate"), DEFAULT_SETTINGS.vatRate, 0, 100),
    manualPaymentsEnabled: (map.get("manual_payments_enabled") ?? "1") === "1",
    onlinePaymentsEnabled: (map.get("online_payments_enabled") ?? "1") === "1",
    paymob: {
      card: map.get("paymob_card_id") ?? "",
      wallet: map.get("paymob_wallet_id") ?? "",
      instapay: map.get("paymob_instapay_id") ?? "",
      kiosk: map.get("paymob_kiosk_id") ?? "",
      installments: map.get("paymob_installments_ids") ?? "",
    },
  };
}

/** Public settings that never throw (for rendering pages when the database is unavailable). */
export async function getSettingsSafe(): Promise<PublicSettings> {
  try {
    return await getSettings();
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setSetting(key: string, value: string) {
  await query("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [key, value]);
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>("SELECT value FROM settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

/** Returns a stored secret, creating it once (first writer wins across concurrent instances). */
export async function getOrCreateSecret(key: string, create: () => string): Promise<string> {
  const existing = await getSetting(key);
  if (existing) return existing;
  await query("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING", [key, create()]);
  return (await getSetting(key))!;
}

export function sessionSecret() {
  if (process.env.ADMIN_SESSION_SECRET) return Promise.resolve(process.env.ADMIN_SESSION_SECRET);
  return getOrCreateSecret("session_secret", () => randomBytes(32).toString("hex"));
}

/** RSA key pair that signs license tokens. The public key is embedded in the Revit plugin. */
let keyPairCache: Promise<{ privateKey: string; publicKey: string }> | null = null;

/** The signing key never changes once created, so it is loaded once per server instance. */
export function licenseKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  keyPairCache ??= loadKeyPair().catch((err) => {
    keyPairCache = null;
    throw err;
  });
  return keyPairCache;
}

async function loadKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  if (process.env.LICENSE_PRIVATE_KEY) {
    const { createPrivateKey, createPublicKey } = await import("node:crypto");
    const privateKey = process.env.LICENSE_PRIVATE_KEY.replace(/\\n/g, "\n");
    const publicKey = createPublicKey(createPrivateKey(privateKey)).export({ type: "spki", format: "pem" }).toString();
    return { privateKey, publicKey };
  }
  const json = await getOrCreateSecret("license_keypair", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    return JSON.stringify({ privateKey, publicKey });
  });
  return JSON.parse(json);
}
