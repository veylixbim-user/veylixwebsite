import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { query } from "@/lib/server/db";
import { keyStats } from "@/lib/server/license-keys";
import { listProducts } from "@/lib/server/products";
import { pendingOrderCount } from "@/lib/server/orders";
import { getSettings } from "@/lib/server/settings";
import { isBlobEnabled } from "@/lib/server/storage";
import { AdminHeader, Card } from "@/components/admin/page-header";

export default async function Dashboard() {
  const [stats, products, pending, settings, activity] = await Promise.all([
    keyStats(),
    listProducts(),
    pendingOrderCount(),
    getSettings(),
    query<{ kind: string; detail: string | null; created_at: Date; key: string | null; product: string | null }>(
      `SELECT a.kind, a.detail, a.created_at, k.key, p.name AS product
       FROM activity a LEFT JOIN license_keys k ON k.id = a.key_id LEFT JOIN products p ON p.id = a.product_id
       ORDER BY a.id DESC LIMIT 12`,
    ),
  ]);
  const published = products.filter((p) => p.published).length;
  const withFile = products.filter((p) => p.fileUrl).length;

  const tiles = [
    { label: "Products", value: products.length, sub: `${published} published`, href: "/admin/products" },
    { label: "License keys", value: stats.total, sub: `${stats.available} unused · ${stats.trial} trial`, href: "/admin/keys" },
    { label: "Active devices", value: stats.active, sub: `${stats.revoked} revoked · ${stats.expired} expired`, href: "/admin/keys?status=active" },
    { label: "Pending payments", value: pending, sub: "InstaPay transfers to confirm", href: "/admin/orders?status=pending" },
  ];

  const setup = [
    { ok: true, label: "Database connected" },
    { ok: isBlobEnabled() || !process.env.VERCEL, label: isBlobEnabled() ? "File storage connected (Vercel Blob)" : process.env.VERCEL ? "Connect Vercel Blob storage for uploads" : "Local file storage (development)" },
    { ok: products.length > 0, label: "Add your first plugin" },
    { ok: withFile > 0, label: "Upload a plugin installer" },
    { ok: published > 0, label: "Publish a product" },
  ];

  return (
    <>
      <AdminHeader title="Dashboard" sub={`License check every ${settings.activationDays} days · Free trial ${settings.trialsEnabled ? `${settings.trialDays} days` : "off"} · InstaPay ${settings.instapayNumber}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-border-strong">
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{t.value.toLocaleString("en-US")}</p>
            <p className="mt-1 text-xs text-muted">{t.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Setup</h2>
          <ul className="mt-4 grid gap-2.5">
            {setup.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5 text-sm">
                {s.ok ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <CircleAlert className="size-4 text-warning" aria-hidden />}
                <span className={s.ok ? "text-fg-soft" : "text-fg"}>{s.label}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No activations or downloads yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border text-sm">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium capitalize">{a.kind.replace("key:", "").replace("-", " ")}</span>
                    {a.key ? <span className="ms-2 font-mono text-xs text-muted">{a.key}</span> : null}
                    {a.product ? <span className="ms-2 text-xs text-muted">{a.product}</span> : null}
                    {a.detail ? <span className="ms-2 text-xs text-muted">{a.detail}</span> : null}
                  </span>
                  <time className="shrink-0 text-xs text-muted">{new Date(a.created_at).toISOString().slice(0, 16).replace("T", " ")}</time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
