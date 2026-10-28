import "server-only";
import { query } from "./db";

/**
 * Security events the owner should be able to see: sign-ins, lockouts, rejected payment callbacks, blocked bots.
 * Written best-effort (a logging failure never breaks a request) and pruned after 90 days.
 */
export type SecurityKind =
  | "admin_login"
  | "admin_login_failed"
  | "admin_lockout"
  | "admin_logout"
  | "admin_session_revoked"
  | "admin_mfa_changed"
  | "admin_password_changed"
  | "payment_hmac_failed"
  | "payment_amount_mismatch"
  | "payment_unknown_order"
  | "payment_duplicate"
  | "payment_refunded"
  | "bot_blocked"
  | "origin_blocked"
  | "rate_limited"
  | "csp_violation"
  | "license_abuse";

export async function logSecurity(kind: SecurityKind, detail?: string, ip?: string) {
  try {
    await query("INSERT INTO security_events (kind, detail, ip) VALUES ($1, $2, $3)", [kind, detail?.slice(0, 500) ?? null, ip?.slice(0, 64) ?? null]);
  } catch (err) {
    console.error("[security-log]", err instanceof Error ? err.message : err);
  }
}

export type SecurityEvent = { id: number; kind: string; detail: string | null; ip: string | null; createdAt: string };

export async function recentSecurityEvents(limit = 200, kind?: string): Promise<SecurityEvent[]> {
  const rows = kind
    ? await query<{ id: number; kind: string; detail: string | null; ip: string | null; created_at: Date }>(
        "SELECT id, kind, detail, ip, created_at FROM security_events WHERE kind = $1 ORDER BY id DESC LIMIT $2",
        [kind, limit],
      )
    : await query<{ id: number; kind: string; detail: string | null; ip: string | null; created_at: Date }>(
        "SELECT id, kind, detail, ip, created_at FROM security_events ORDER BY id DESC LIMIT $1",
        [limit],
      );
  return rows.map((r) => ({ id: r.id, kind: r.kind, detail: r.detail, ip: r.ip, createdAt: new Date(r.created_at).toISOString() }));
}

export async function pruneSecurityEvents() {
  await query("DELETE FROM security_events WHERE created_at < now() - interval '90 days'").catch(() => undefined);
}
