import "server-only";
import { query } from "./db";

export type Message = {
  id: number;
  topic: string;
  name: string;
  email: string;
  company: string | null;
  seats: string | null;
  body: string;
  locale: string | null;
  handled: boolean;
  createdAt: Date;
};

export async function listMessages(filter: "open" | "handled" | "all") {
  const where = filter === "open" ? "WHERE NOT handled" : filter === "handled" ? "WHERE handled" : "";
  const rows = await query<{ id: number; topic: string; name: string; email: string; company: string | null; seats: string | null; body: string; locale: string | null; handled: boolean; created_at: Date }>(
    `SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT 500`,
  );
  return rows.map<Message>((r) => ({ ...r, createdAt: new Date(r.created_at) }));
}

export async function openMessageCount() {
  const rows = await query<{ n: number | string }>("SELECT count(*)::int AS n FROM messages WHERE NOT handled");
  return Number(rows[0]?.n ?? 0);
}

export async function setMessageHandled(id: number, handled: boolean) {
  await query("UPDATE messages SET handled = $2 WHERE id = $1", [id, handled]);
}

export async function deleteMessage(id: number) {
  await query("DELETE FROM messages WHERE id = $1", [id]);
}

export type Customer = {
  email: string;
  name: string | null;
  phone: string | null;
  sources: string[];
  orders: number;
  paidOrders: number;
  trials: number;
  messages: number;
  firstSeen: Date;
  lastSeen: Date;
  lastEmailedAt: Date | null;
};

/** Everyone who gave us their email: buyers, trial users, newsletter sign-ups and people who wrote in. */
export async function listCustomers(q?: string, source?: string) {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (q?.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    filters.push(`(c.email LIKE $${params.length} OR lower(coalesce(c.name, '')) LIKE $${params.length})`);
  }
  if (source && ["order", "trial", "newsletter", "message"].includes(source)) {
    params.push(source);
    filters.push(`$${params.length} = ANY(c.sources)`);
  }
  const rows = await query<{
    email: string;
    name: string | null;
    phone: string | null;
    sources: string[] | string;
    orders: number;
    paid_orders: number;
    trials: number;
    messages: number;
    first_seen: Date;
    last_seen: Date;
    last_emailed_at: Date | null;
  }>(
    `WITH raw AS (
       SELECT lower(customer_email) AS email, customer_name AS name, customer_phone AS phone, 'order' AS source, created_at, (status = 'paid') AS paid FROM orders
       UNION ALL
       SELECT lower(assigned_to), NULLIF(regexp_replace(coalesce(note, ''), '^Trial · ', ''), ''), NULL, 'trial', created_at, false FROM license_keys WHERE trial AND assigned_to LIKE '%@%'
       UNION ALL
       SELECT lower(email), NULL, NULL, 'newsletter', created_at, false FROM subscribers
       UNION ALL
       SELECT lower(email), name, NULL, 'message', created_at, false FROM messages
     ), c AS (
       SELECT email,
         (array_agg(name ORDER BY created_at DESC) FILTER (WHERE name IS NOT NULL))[1] AS name,
         (array_agg(phone ORDER BY created_at DESC) FILTER (WHERE phone IS NOT NULL))[1] AS phone,
         array_agg(DISTINCT source) AS sources,
         count(*) FILTER (WHERE source = 'order')::int AS orders,
         count(*) FILTER (WHERE source = 'order' AND paid)::int AS paid_orders,
         count(*) FILTER (WHERE source = 'trial')::int AS trials,
         count(*) FILTER (WHERE source = 'message')::int AS messages,
         min(created_at) AS first_seen,
         max(created_at) AS last_seen
       FROM raw GROUP BY email
     )
     SELECT c.*, (SELECT max(l.created_at) FROM email_log l WHERE lower(l.to_email) = c.email AND l.status = 'sent') AS last_emailed_at
     FROM c ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
     ORDER BY c.last_seen DESC LIMIT 2000`,
    params,
  );
  return rows.map<Customer>((r) => ({
    email: r.email,
    name: r.name,
    phone: r.phone,
    sources: Array.isArray(r.sources) ? r.sources : String(r.sources).replace(/[{}]/g, "").split(",").filter(Boolean),
    orders: r.orders,
    paidOrders: r.paid_orders,
    trials: r.trials,
    messages: r.messages,
    firstSeen: new Date(r.first_seen),
    lastSeen: new Date(r.last_seen),
    lastEmailedAt: r.last_emailed_at ? new Date(r.last_emailed_at) : null,
  }));
}

export async function recentEmails(limit = 20) {
  return query<{ id: number; to_email: string; subject: string; kind: string; status: string; error: string | null; created_at: Date }>(
    "SELECT id, to_email, subject, kind, status, error, created_at FROM email_log ORDER BY id DESC LIMIT $1",
    [limit],
  );
}
