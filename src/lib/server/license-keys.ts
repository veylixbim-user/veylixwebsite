import "server-only";
import { createSign } from "node:crypto";
import { query, transaction, type Queryable } from "./db";
import { licenseKey, normalizeKey } from "./ids";
import { getSettings, licenseKeyPair } from "./settings";

export const SEED_KEY_COUNT = 1000;
const DAY_MS = 86_400_000;

export type KeyStatus = "available" | "assigned" | "active" | "expired" | "revoked";

export type LicenseKey = {
  id: number;
  key: string;
  productId: string | null;
  productName: string | null;
  productSlug: string | null;
  revoked: boolean;
  assignedTo: string | null;
  note: string | null;
  orderId: string | null;
  deviceId: string | null;
  deviceName: string | null;
  activatedAt: Date | null;
  lastCheckAt: Date | null;
  expiresAt: Date | null;
  activationDays: number | null;
  trial: boolean;
  trialDays: number | null;
  downloads: number;
  createdAt: Date;
  status: KeyStatus;
};

type KeyRow = {
  id: number;
  key: string;
  product_id: string | null;
  product_name: string | null;
  product_slug: string | null;
  revoked: boolean;
  assigned_to: string | null;
  note: string | null;
  order_id: string | null;
  device_id: string | null;
  device_name: string | null;
  activated_at: Date | null;
  last_check_at: Date | null;
  expires_at: Date | null;
  activation_days: number | null;
  trial: boolean;
  trial_days: number | null;
  downloads: number;
  created_at: Date;
};

const d = (v: Date | string | null) => (v ? new Date(v) : null);

function statusOf(r: KeyRow, now = Date.now()): KeyStatus {
  if (r.revoked) return "revoked";
  if (r.expires_at && new Date(r.expires_at).getTime() < now) return "expired";
  if (r.device_id) return "active";
  if (r.assigned_to || r.order_id) return "assigned";
  return "available";
}

function map(r: KeyRow): LicenseKey {
  return {
    id: r.id,
    key: r.key,
    productId: r.product_id,
    productName: r.product_name,
    productSlug: r.product_slug,
    revoked: r.revoked,
    assignedTo: r.assigned_to,
    note: r.note,
    orderId: r.order_id,
    deviceId: r.device_id,
    deviceName: r.device_name,
    activatedAt: d(r.activated_at),
    lastCheckAt: d(r.last_check_at),
    expiresAt: d(r.expires_at),
    activationDays: r.activation_days,
    trial: r.trial,
    trialDays: r.trial_days,
    downloads: r.downloads,
    createdAt: new Date(r.created_at),
    status: statusOf(r),
  };
}

const SELECT = `SELECT k.*, p.name AS product_name, p.slug AS product_slug FROM license_keys k LEFT JOIN products p ON p.id = k.product_id`;

let seeded = false;

/**
 * Generates the initial pool of 1000 universal keys exactly once. The marker row and the keys are
 * written in one transaction: a concurrent caller blocks on the marker's unique index until the
 * first one commits, so nobody ever reads a half-seeded table.
 */
export async function ensureSeedKeys() {
  if (seeded) return false;
  const created = await transaction(async (tx) => {
    const won = await tx.query<{ key: string }>(
      "INSERT INTO settings (key, value) VALUES ('keys_seeded', $1) ON CONFLICT (key) DO NOTHING RETURNING key",
      [new Date().toISOString()],
    );
    if (won.length === 0) return false;
    await generateKeys(SEED_KEY_COUNT, { note: "Initial pool" }, tx);
    return true;
  });
  seeded = true;
  return created;
}

export async function generateKeys(
  count: number,
  opts: { productId?: string | null; note?: string | null; expiresAt?: Date | null; activationDays?: number | null; assignedTo?: string | null; orderId?: string | null } = {},
  db: Queryable = { query },
): Promise<string[]> {
  const n = Math.max(1, Math.min(10_000, Math.floor(count)));
  const keys = new Set<string>();
  while (keys.size < n) keys.add(licenseKey());
  const list = [...keys];
  const inserted = await db.query<{ key: string }>(
    `INSERT INTO license_keys (key, product_id, note, expires_at, activation_days, assigned_to, order_id)
     SELECT k, $2, $3, $4, $5, $6, $7 FROM unnest($1::text[]) AS k
     ON CONFLICT (key) DO NOTHING RETURNING key`,
    [list, opts.productId ?? null, opts.note ?? null, opts.expiresAt ?? null, opts.activationDays ?? null, opts.assignedTo ?? null, opts.orderId ?? null],
  );
  return inserted.map((r) => r.key);
}

export type KeyFilter = {
  q?: string;
  status?: KeyStatus | "all";
  productId?: string | "all" | "universal";
  type?: "all" | "paid" | "trial";
  page?: number;
  pageSize?: number;
};

function whereFor(f: KeyFilter): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value?: unknown) => {
    if (value !== undefined) {
      params.push(value);
      clauses.push(sql.replace("?", `$${params.length}`));
    } else clauses.push(sql);
  };
  if (f.q?.trim()) {
    params.push(`%${f.q.trim()}%`);
    const p = `$${params.length}`;
    clauses.push(`(k.key ILIKE ${p} OR k.assigned_to ILIKE ${p} OR k.note ILIKE ${p} OR k.device_name ILIKE ${p} OR k.order_id ILIKE ${p})`);
  }
  switch (f.status) {
    case "revoked":
      add("k.revoked = true");
      break;
    case "expired":
      add("k.revoked = false AND k.expires_at IS NOT NULL AND k.expires_at < now()");
      break;
    case "active":
      add("k.revoked = false AND (k.expires_at IS NULL OR k.expires_at >= now()) AND k.device_id IS NOT NULL");
      break;
    case "assigned":
      add("k.revoked = false AND (k.expires_at IS NULL OR k.expires_at >= now()) AND k.device_id IS NULL AND (k.assigned_to IS NOT NULL OR k.order_id IS NOT NULL)");
      break;
    case "available":
      add("k.revoked = false AND (k.expires_at IS NULL OR k.expires_at >= now()) AND k.device_id IS NULL AND k.assigned_to IS NULL AND k.order_id IS NULL");
      break;
  }
  if (f.type === "trial") add("k.trial = true");
  else if (f.type === "paid") add("k.trial = false");
  if (f.productId === "universal") add("k.product_id IS NULL");
  else if (f.productId && f.productId !== "all") add("k.product_id = ?", f.productId);
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function listKeys(f: KeyFilter) {
  await ensureSeedKeys();
  const pageSize = Math.min(500, Math.max(10, f.pageSize ?? 50));
  const page = Math.max(1, f.page ?? 1);
  const { sql, params } = whereFor(f);
  const [rows, total] = await Promise.all([
    query<KeyRow>(`${SELECT} ${sql} ORDER BY k.id ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, params),
    query<{ n: number | string }>(`SELECT count(*)::int AS n FROM license_keys k ${sql}`, params),
  ]);
  return { keys: rows.map(map), total: Number(total[0]?.n ?? 0), page, pageSize };
}

export async function exportKeys(f: KeyFilter) {
  await ensureSeedKeys();
  const { sql, params } = whereFor(f);
  return (await query<KeyRow>(`${SELECT} ${sql} ORDER BY k.id ASC`, params)).map(map);
}

export async function keyStats() {
  await ensureSeedKeys();
  const rows = await query<Record<string, number | string>>(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE revoked)::int AS revoked,
      count(*) FILTER (WHERE trial)::int AS trial,
      count(*) FILTER (WHERE NOT revoked AND expires_at IS NOT NULL AND expires_at < now())::int AS expired,
      count(*) FILTER (WHERE NOT revoked AND (expires_at IS NULL OR expires_at >= now()) AND device_id IS NOT NULL)::int AS active,
      count(*) FILTER (WHERE NOT revoked AND (expires_at IS NULL OR expires_at >= now()) AND device_id IS NULL AND (assigned_to IS NOT NULL OR order_id IS NOT NULL))::int AS assigned,
      count(*) FILTER (WHERE NOT revoked AND (expires_at IS NULL OR expires_at >= now()) AND device_id IS NULL AND assigned_to IS NULL AND order_id IS NULL)::int AS available
    FROM license_keys`);
  const r = rows[0] ?? {};
  const n = (k: string) => Number(r[k] ?? 0);
  return { total: n("total"), trial: n("trial"), revoked: n("revoked"), expired: n("expired"), active: n("active"), assigned: n("assigned"), available: n("available") };
}

export async function getKey(value: string): Promise<LicenseKey | null> {
  const rows = await query<KeyRow>(`${SELECT} WHERE k.key = $1`, [normalizeKey(value)]);
  return rows[0] ? map(rows[0]) : null;
}

export async function getKeyById(id: number): Promise<LicenseKey | null> {
  const rows = await query<KeyRow>(`${SELECT} WHERE k.id = $1`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

export type KeyUpdate =
  | { action: "revoke" }
  | { action: "restore" }
  | { action: "reset-device" }
  | { action: "force-recheck" }
  | { action: "delete" }
  | { action: "set-expiry"; expiresAt: Date | null }
  | { action: "set-days"; days: number | null }
  | { action: "assign"; assignedTo: string | null; note: string | null }
  | { action: "set-product"; productId: string | null };

export async function updateKey(id: number, u: KeyUpdate) {
  switch (u.action) {
    case "revoke":
      return query("UPDATE license_keys SET revoked = true WHERE id = $1", [id]);
    case "restore":
      return query("UPDATE license_keys SET revoked = false WHERE id = $1", [id]);
    case "reset-device":
      return query("UPDATE license_keys SET device_id = NULL, device_name = NULL, last_check_at = NULL WHERE id = $1", [id]);
    case "force-recheck":
      return query("UPDATE license_keys SET last_check_at = to_timestamp(0) WHERE id = $1 AND last_check_at IS NOT NULL", [id]);
    case "delete":
      return query("DELETE FROM license_keys WHERE id = $1", [id]);
    case "set-expiry":
      return query("UPDATE license_keys SET expires_at = $2 WHERE id = $1", [id, u.expiresAt]);
    case "set-days":
      return query("UPDATE license_keys SET activation_days = $2 WHERE id = $1", [id, u.days]);
    case "assign":
      return query("UPDATE license_keys SET assigned_to = $2, note = $3 WHERE id = $1", [id, u.assignedTo, u.note]);
    case "set-product":
      return query("UPDATE license_keys SET product_id = $2 WHERE id = $1", [id, u.productId]);
  }
}

export async function logActivity(kind: string, data: { keyId?: number | null; productId?: string | null; detail?: string; ip?: string | null }) {
  try {
    await query("INSERT INTO activity (kind, key_id, product_id, detail, ip) VALUES ($1, $2, $3, $4, $5)", [kind, data.keyId ?? null, data.productId ?? null, data.detail ?? null, data.ip ?? null]);
  } catch {
    /* activity log is best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* Download + activation                                               */
/* ------------------------------------------------------------------ */

export type LicenseError = "invalid_key" | "revoked" | "expired" | "wrong_product" | "device_mismatch" | "not_activated" | "trial_used";

/** Checks whether a key may download a given product (does not bind a device). */
export async function authorizeDownload(value: string, productId: string): Promise<{ ok: true; key: LicenseKey } | { ok: false; error: LicenseError }> {
  const key = await getKey(value);
  if (!key) return { ok: false, error: "invalid_key" };
  if (key.revoked) return { ok: false, error: "revoked" };
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return { ok: false, error: "expired" };
  if (key.productId && key.productId !== productId) return { ok: false, error: "wrong_product" };
  await query("UPDATE license_keys SET downloads = downloads + 1 WHERE id = $1", [key.id]);
  return { ok: true, key };
}

export type LicenseGrant = {
  key: string;
  deviceId: string;
  scope: string; // product slug, or "*" for all products
  productName: string | null;
  issuedAt: Date;
  validUntil: Date;
  expiresAt: Date | null;
  checkIntervalDays: number;
  payload: string;
  signature: string;
};

function validUntilFor(key: LicenseKey, days: number, from: Date) {
  const until = from.getTime() + days * DAY_MS;
  return new Date(key.expiresAt ? Math.min(until, key.expiresAt.getTime()) : until);
}

async function sign(payload: string) {
  const { privateKey } = await licenseKeyPair();
  const signer = createSign("SHA256");
  signer.update(payload, "utf8");
  return signer.sign(privateKey, "base64");
}

async function grantFor(key: LicenseKey, deviceId: string, lastCheck: Date, nonce: string, settings: { activationDays: number }): Promise<LicenseGrant> {
  const days = key.activationDays ?? settings.activationDays;
  const issuedAt = new Date();
  const validUntil = validUntilFor(key, days, lastCheck);
  const scope = key.productSlug ?? "*";
  const unix = (dt: Date | null) => (dt ? Math.floor(dt.getTime() / 1000) : 0);
  // Pipe-separated so the Revit plugin can verify it without a JSON library. The client nonce makes every
  // response single-use: a recorded reply can't be replayed to the plugin later.
  const payload = ["VLX1", key.key, deviceId, scope, unix(validUntil), unix(issuedAt), unix(key.expiresAt), days, key.trial ? 1 : 0, nonce].join("|");
  return {
    key: key.key,
    deviceId,
    scope,
    productName: key.productName,
    issuedAt,
    validUntil,
    expiresAt: key.expiresAt,
    checkIntervalDays: days,
    payload,
    signature: await sign(payload),
  };
}

const DEVICE_RE = /^[A-Za-z0-9._:\-]{8,128}$/;
const NONCE_RE = /^[A-Za-z0-9]{0,64}$/;

function checkUsable(key: LicenseKey | null, productSlug?: string | null): LicenseError | null {
  if (!key) return "invalid_key";
  if (key.revoked) return "revoked";
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return "expired";
  if (productSlug && key.productSlug && key.productSlug !== productSlug) return "wrong_product";
  return null;
}

/**
 * Activation = the user typing the key inside Revit. Binds the key to the first device that uses it and
 * starts a new check period (settings.activationDays, or the key's own override).
 */
export async function activate(input: { key: string; deviceId: string; deviceName?: string; product?: string | null; nonce?: string; ip?: string | null }) {
  const nonce = input.nonce ?? "";
  if (!DEVICE_RE.test(input.deviceId) || !NONCE_RE.test(nonce)) return { ok: false as const, error: "invalid_key" as LicenseError };
  const value = normalizeKey(input.key);
  const deviceName = (input.deviceName ?? "").slice(0, 100) || null;
  // Load settings and the signing key before the transaction: on the single-connection dev database a
  // query issued outside the open transaction would wait on it forever.
  const [settings] = await Promise.all([getSettings(), licenseKeyPair()]);

  return transaction(async (tx) => {
    const rows = await tx.query<KeyRow>(`${SELECT} WHERE k.key = $1 FOR UPDATE OF k`, [value]);
    const key = rows[0] ? map(rows[0]) : null;
    const error = checkUsable(key, input.product);
    if (error || !key) return { ok: false as const, error: error ?? ("invalid_key" as LicenseError) };
    if (key.deviceId && key.deviceId !== input.deviceId) return { ok: false as const, error: "device_mismatch" as LicenseError };

    const now = new Date();
    let expiresAt = key.expiresAt;
    if (key.trial && !key.deviceId) {
      // One trial per device and product.
      const used = await tx.query(
        "SELECT 1 FROM license_keys WHERE trial = true AND device_id = $1 AND product_id IS NOT DISTINCT FROM $2 AND id <> $3 LIMIT 1",
        [input.deviceId, key.productId, key.id],
      );
      if (used.length > 0) return { ok: false as const, error: "trial_used" as LicenseError };
      // The trial clock starts at first activation, not when the key was issued.
      if (!expiresAt) {
        const days = key.trialDays ?? settings.trialDays;
        expiresAt = new Date(now.getTime() + days * DAY_MS);
      }
    }
    await tx.query(
      `UPDATE license_keys SET device_id = $2, device_name = COALESCE($3, device_name), activated_at = COALESCE(activated_at, $4), last_check_at = $4, expires_at = $5 WHERE id = $1`,
      [key.id, input.deviceId, deviceName, now, expiresAt],
    );
    await tx.query("INSERT INTO activity (kind, key_id, product_id, detail, ip) VALUES ('activate', $1, $2, $3, $4)", [key.id, key.productId, deviceName, input.ip ?? null]);
    return { ok: true as const, grant: await grantFor({ ...key, deviceId: input.deviceId, expiresAt }, input.deviceId, now, nonce, settings) };
  });
}

/**
 * Status check the plugin makes when online. Does NOT extend the period — it returns the current,
 * re-signed period so admin changes (shorter interval, force re-check, revoke, device reset) take effect.
 */
export async function licenseStatus(input: { key: string; deviceId: string; product?: string | null; nonce?: string }) {
  const nonce = input.nonce ?? "";
  if (!DEVICE_RE.test(input.deviceId) || !NONCE_RE.test(nonce)) return { ok: false as const, error: "invalid_key" as LicenseError };
  const key = await getKey(input.key);
  const error = checkUsable(key, input.product);
  if (error || !key) return { ok: false as const, error: error ?? ("invalid_key" as LicenseError) };
  if (!key.deviceId || !key.lastCheckAt) return { ok: false as const, error: "not_activated" as LicenseError };
  if (key.deviceId !== input.deviceId) return { ok: false as const, error: "device_mismatch" as LicenseError };
  return { ok: true as const, grant: await grantFor(key, input.deviceId, key.lastCheckAt, nonce, await getSettings()) };
}

/** Public key formats for embedding in the Revit plugin. */
export async function publicKeyFormats() {
  const { publicKey } = await licenseKeyPair();
  const { createPublicKey } = await import("node:crypto");
  const jwk = createPublicKey(publicKey).export({ format: "jwk" }) as { n: string; e: string };
  const b64 = (s: string) => Buffer.from(s, "base64url").toString("base64");
  const xml = `<RSAKeyValue><Modulus>${b64(jwk.n)}</Modulus><Exponent>${b64(jwk.e)}</Exponent></RSAKeyValue>`;
  return { pem: publicKey, xml };
}

/** Issues (or re-sends) a free-trial key for one product. The trial clock starts at first activation. */
export async function issueTrialKey(input: { email: string; name: string; productId: string }) {
  const existing = await query<{ key: string }>(
    "SELECT key FROM license_keys WHERE trial = true AND lower(assigned_to) = lower($1) AND product_id = $2 ORDER BY id LIMIT 1",
    [input.email, input.productId],
  );
  if (existing[0]) return { key: existing[0].key, reused: true };
  const key = licenseKey();
  await query("INSERT INTO license_keys (key, product_id, trial, assigned_to, note) VALUES ($1, $2, true, $3, $4)", [
    key,
    input.productId,
    input.email,
    `Trial · ${input.name}`.slice(0, 200),
  ]);
  return { key, reused: false };
}
