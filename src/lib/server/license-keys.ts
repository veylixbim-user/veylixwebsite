import "server-only";
import { createSign } from "node:crypto";
import { query, transaction, type Queryable } from "./db";
import { candidatePatterns, formatComponents, parseComponents, sameHardware } from "./hardware";
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
  deviceComponents: string | null;
  /** Times the key followed its PC through a hardware change (Windows reinstall, new network card…). */
  hwChanges: number;
  hwWindowStart: Date | null;
  hwWindowCount: number;
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
  device_components: string | null;
  hw_changes: number | null;
  hw_window_start: Date | null;
  hw_window_count: number | null;
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
    deviceComponents: r.device_components,
    hwChanges: r.hw_changes ?? 0,
    hwWindowStart: d(r.hw_window_start),
    hwWindowCount: r.hw_window_count ?? 0,
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
      return query(
        "UPDATE license_keys SET device_id = NULL, device_name = NULL, device_components = NULL, last_check_at = NULL, hw_window_start = NULL, hw_window_count = 0 WHERE id = $1",
        [id],
      );
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

export type LicenseError =
  | "invalid_key"
  | "revoked"
  | "expired"
  | "wrong_product"
  | "device_mismatch"
  | "not_activated"
  | "trial_used"
  | "trial_not_eligible"
  | "already_licensed"
  | "hw_limit";

/** A paid renewal the customer has submitted keeps the license alive this long while the admin checks the transfer. */
export const PENDING_PAYMENT_DAYS = 7;
/** Hardware changes a key may follow automatically within HW_WINDOW_DAYS before support must reset it. */
export const HW_CHANGE_LIMIT = 3;
const HW_WINDOW_DAYS = 30;

/**
 * The moment a key stops working: its end date plus the renewal grace period, extended while a renewal
 * payment submitted in time is waiting for approval. null = never ends.
 */
export function effectiveEnd(key: Pick<LicenseKey, "expiresAt" | "trial">, graceDays: number, pendingSince?: Date | null): Date | null {
  if (!key.expiresAt) return null;
  // Trials end exactly on time; paid keys get the grace period.
  let end = key.expiresAt.getTime() + (key.trial ? 0 : graceDays * DAY_MS);
  if (!key.trial && pendingSince && pendingSince.getTime() <= end) end = Math.max(end, pendingSince.getTime() + PENDING_PAYMENT_DAYS * DAY_MS);
  return new Date(end);
}

async function pendingRenewalSince(db: Queryable, key: string): Promise<Date | null> {
  const rows = await db.query<{ since: Date | null }>("SELECT min(created_at) AS since FROM orders WHERE status = 'pending' AND renew_key = $1", [key]);
  return rows[0]?.since ? new Date(rows[0].since) : null;
}

/** Checks whether a key may download a given product (does not bind a device). */
export async function authorizeDownload(value: string, productId: string): Promise<{ ok: true; key: LicenseKey } | { ok: false; error: LicenseError }> {
  const key = await getKey(value);
  if (!key) return { ok: false, error: "invalid_key" };
  if (key.revoked) return { ok: false, error: "revoked" };
  const { renewalGraceDays } = await getSettings();
  const end = effectiveEnd(key, renewalGraceDays, key.trial ? null : await pendingRenewalSince({ query }, key.key));
  if (end && end.getTime() < Date.now()) return { ok: false, error: "expired" };
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
  renewDue: Date | null;
  checkIntervalDays: number;
  payload: string;
  signature: string;
};

async function sign(payload: string) {
  const { privateKey } = await licenseKeyPair();
  const signer = createSign("SHA256");
  signer.update(payload, "utf8");
  return signer.sign(privateKey, "base64");
}

async function grantFor(
  key: LicenseKey,
  device: { id: string; components: string },
  lastCheck: Date,
  nonce: string,
  settings: { activationDays: number; renewalGraceDays: number },
  pendingSince: Date | null,
): Promise<LicenseGrant> {
  const days = key.activationDays ?? settings.activationDays;
  const issuedAt = new Date();
  const hardStop = effectiveEnd(key, settings.renewalGraceDays, pendingSince);
  const nextCheck = lastCheck.getTime() + days * DAY_MS;
  const validUntil = new Date(hardStop ? Math.min(nextCheck, hardStop.getTime()) : nextCheck);
  const scope = key.productSlug ?? "*";
  const unix = (dt: Date | null) => (dt ? Math.floor(dt.getTime() / 1000) : 0);
  // Pipe-separated so the Revit plugin can verify it without a JSON library:
  //   VLX1|key|deviceId|scope|validUntil|issuedAt|hardStop|checkDays|trial|nonce|components|renewDue
  // The client nonce makes every response single-use, so a recorded reply can't be replayed later. The
  // hardware components let the plugin recognise its own PC offline after small hardware changes.
  const payload = [
    "VLX1",
    key.key,
    device.id,
    scope,
    unix(validUntil),
    unix(issuedAt),
    unix(hardStop),
    days,
    key.trial ? 1 : 0,
    nonce,
    device.components,
    unix(key.expiresAt),
  ].join("|");
  return {
    key: key.key,
    deviceId: device.id,
    scope,
    productName: key.productName,
    issuedAt,
    validUntil,
    expiresAt: hardStop,
    renewDue: key.expiresAt,
    checkIntervalDays: days,
    payload,
    signature: await sign(payload),
  };
}

const DEVICE_RE = /^[A-Za-z0-9._:\-]{8,128}$/;
const NONCE_RE = /^[A-Za-z0-9]{0,64}$/;

function checkUsable(key: LicenseKey | null, productSlug: string | null | undefined, end: Date | null): LicenseError | null {
  if (!key) return "invalid_key";
  if (key.revoked) return "revoked";
  if (end && end.getTime() < Date.now()) return "expired";
  if (productSlug && key.productSlug && key.productSlug !== productSlug) return "wrong_product";
  return null;
}

type DeviceInput = { id: string; components: string };

/** Same PC? Exact device ID, or enough hardware signals in common (see hardware.ts). */
function isSameDevice(key: Pick<LicenseKey, "deviceId" | "deviceComponents">, device: DeviceInput) {
  if (!key.deviceId) return false;
  return key.deviceId === device.id || sameHardware(key.deviceComponents, device.components);
}

/** Other keys ever bound to this PC (exact ID or matching hardware), excluding `excludeId`. */
async function keysOnDevice(db: Queryable, device: DeviceInput, excludeId: number): Promise<LicenseKey[]> {
  const rows = await db.query<KeyRow>(
    `${SELECT} WHERE k.id <> $1 AND k.device_id IS NOT NULL AND (k.device_id = $2 OR k.device_components LIKE ANY($3::text[])) ORDER BY k.id LIMIT 500`,
    [excludeId, device.id, candidatePatterns(device.components)],
  );
  return rows.map(map).filter((k) => isSameDevice(k, device));
}

const covers = (k: LicenseKey, productSlug: string | null | undefined, productId: string | null) =>
  k.productId === null || (productSlug ? k.productSlug === productSlug : productId === null || k.productId === productId);

/**
 * Activation = the user typing the key inside Revit. Binds the key to the first PC that uses it and starts
 * a new check period (settings.activationDays, or the key's own override). Rules:
 *   - one key = one PC (hardware changes on that PC are followed automatically, up to HW_CHANGE_LIMIT a month);
 *   - one working paid license per product per PC: a second key for the same plugin can't be used on it;
 *   - one free trial per PC per product, and no trial on a PC that already had a paid license for it.
 */
export async function activate(input: {
  key: string;
  deviceId: string;
  deviceName?: string;
  components?: string;
  product?: string | null;
  nonce?: string;
  ip?: string | null;
}) {
  const nonce = input.nonce ?? "";
  if (!DEVICE_RE.test(input.deviceId) || !NONCE_RE.test(nonce)) return { ok: false as const, error: "invalid_key" as LicenseError };
  const value = normalizeKey(input.key);
  const deviceName = (input.deviceName ?? "").replace(/[\r\n|]/g, " ").slice(0, 100) || null;
  const device: DeviceInput = { id: input.deviceId, components: formatComponents(parseComponents(input.components)) };
  // Load settings and the signing key before the transaction: on the single-connection dev database a
  // query issued outside the open transaction would wait on it forever.
  const [settings] = await Promise.all([getSettings(), licenseKeyPair()]);

  return transaction(async (tx) => {
    const fail = (error: LicenseError) => ({ ok: false as const, error });
    const rows = await tx.query<KeyRow>(`${SELECT} WHERE k.key = $1 FOR UPDATE OF k`, [value]);
    const key = rows[0] ? map(rows[0]) : null;
    if (!key) return fail("invalid_key");
    const pending = key.trial ? null : await pendingRenewalSince(tx, key.key);
    const error = checkUsable(key, input.product, effectiveEnd(key, settings.renewalGraceDays, pending));
    if (error) return fail(error);

    const now = new Date();
    let hwChanged = false;
    if (key.deviceId && key.deviceId !== device.id) {
      if (!sameHardware(key.deviceComponents, device.components)) return fail("device_mismatch");
      // Same PC after a hardware change. Follow it, but not endlessly: frequent "changes" mean the key is
      // being passed between PCs.
      const windowOpen = key.hwWindowStart && now.getTime() - key.hwWindowStart.getTime() < HW_WINDOW_DAYS * DAY_MS;
      if (windowOpen && key.hwWindowCount >= HW_CHANGE_LIMIT) {
        await tx.query("INSERT INTO activity (kind, key_id, product_id, detail, ip) VALUES ('hw-limit', $1, $2, $3, $4)", [key.id, key.productId, deviceName, input.ip ?? null]);
        return fail("hw_limit");
      }
      hwChanged = true;
      await tx.query(
        `UPDATE license_keys SET hw_changes = hw_changes + 1,
           hw_window_start = CASE WHEN $2::boolean THEN hw_window_start ELSE $3 END,
           hw_window_count = CASE WHEN $2::boolean THEN hw_window_count + 1 ELSE 1 END
         WHERE id = $1`,
        [key.id, Boolean(windowOpen), now],
      );
    }

    let expiresAt = key.expiresAt;
    if (!key.deviceId) {
      // First activation of this key: enforce the per-PC rules against every other key used on this PC.
      const others = (await keysOnDevice(tx, device, key.id)).filter((k) => covers(k, input.product, key.productId));
      if (key.trial) {
        if (others.some((k) => !k.trial)) return fail("trial_not_eligible");
        if (others.some((k) => k.trial)) return fail("trial_used");
        // The trial clock starts at first activation, not when the key was issued.
        if (!expiresAt) expiresAt = new Date(now.getTime() + (key.trialDays ?? settings.trialDays) * DAY_MS);
      } else {
        const working = others.filter((k) => !k.trial && !k.revoked && !isPast(effectiveEnd(k, settings.renewalGraceDays)));
        if (working.length > 0) {
          await tx.query("INSERT INTO activity (kind, key_id, product_id, detail, ip) VALUES ('duplicate-blocked', $1, $2, $3, $4)", [
            key.id,
            key.productId,
            `PC already licensed by ${working[0].key}`,
            input.ip ?? null,
          ]);
          return fail("already_licensed");
        }
      }
    }

    await tx.query(
      `UPDATE license_keys SET device_id = $2, device_name = COALESCE($3, device_name), device_components = COALESCE(NULLIF($4, ''), device_components),
         activated_at = COALESCE(activated_at, $5), last_check_at = $5, expires_at = $6 WHERE id = $1`,
      [key.id, device.id, deviceName, device.components, now, expiresAt],
    );
    await tx.query("INSERT INTO activity (kind, key_id, product_id, detail, ip) VALUES ($1, $2, $3, $4, $5)", [
      hwChanged ? "hw-change" : "activate",
      key.id,
      key.productId,
      deviceName,
      input.ip ?? null,
    ]);
    return {
      ok: true as const,
      grant: await grantFor({ ...key, deviceId: device.id, expiresAt }, device, now, nonce, settings, pending),
    };
  });
}

const isPast = (d: Date | null) => Boolean(d && d.getTime() < Date.now());

/**
 * Status check the plugin makes when online. Does NOT extend the period — it returns the current,
 * re-signed period so admin changes (shorter interval, force re-check, revoke, device reset) take effect.
 */
export async function licenseStatus(input: { key: string; deviceId: string; components?: string; product?: string | null; nonce?: string }) {
  const nonce = input.nonce ?? "";
  if (!DEVICE_RE.test(input.deviceId) || !NONCE_RE.test(nonce)) return { ok: false as const, error: "invalid_key" as LicenseError };
  const device: DeviceInput = { id: input.deviceId, components: formatComponents(parseComponents(input.components)) };
  const [key, settings] = await Promise.all([getKey(input.key), getSettings()]);
  const pending = key && !key.trial ? await pendingRenewalSince({ query }, key.key) : null;
  const error = checkUsable(key, input.product, key ? effectiveEnd(key, settings.renewalGraceDays, pending) : null);
  if (error || !key) return { ok: false as const, error: error ?? ("invalid_key" as LicenseError) };
  if (!key.deviceId || !key.lastCheckAt) return { ok: false as const, error: "not_activated" as LicenseError };
  // A hardware change is only accepted by entering the key again (activation), which is rate-limited and counted.
  if (!isSameDevice(key, device)) return { ok: false as const, error: "device_mismatch" as LicenseError };
  return { ok: true as const, grant: await grantFor(key, device, key.lastCheckAt, nonce, settings, pending) };
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

/**
 * Paid keys that still work (not revoked, not past end date + grace) covering any of `productIds`, found by
 * the customer's email or by the PC they were activated on. Used by checkout to stop duplicate purchases.
 */
export async function workingPaidKeys(by: { email?: string; deviceId?: string }, productIds: string[]): Promise<LicenseKey[]> {
  if (!by.email && !by.deviceId) return [];
  const settings = await getSettings();
  const rows = await query<KeyRow>(
    `${SELECT} WHERE NOT k.revoked AND NOT k.trial AND (k.product_id IS NULL OR k.product_id = ANY($1::text[]))
       AND (${by.email ? "lower(k.assigned_to) = lower($2)" : "k.device_id = $2"}) ORDER BY k.id LIMIT 50`,
    [productIds, by.email ?? by.deviceId],
  );
  return rows.map(map).filter((k) => !isPast(effectiveEnd(k, settings.renewalGraceDays)));
}
