import Link from "next/link";
import { Download, Search } from "lucide-react";
import { keyStats, listKeys, type KeyFilter, type LicenseKey } from "@/lib/server/license-keys";
import { listProducts } from "@/lib/server/products";
import { getSettings } from "@/lib/server/settings";
import { AdminHeader } from "@/components/admin/page-header";
import { GenerateKeys } from "@/components/admin/generate-keys";
import { KeyManage, type KeyView } from "@/components/admin/key-manage";
import { CopyButton } from "@/components/admin/copy-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, "default" | "accent" | "success" | "violet"> = {
  available: "default",
  assigned: "violet",
  active: "success",
  expired: "default",
  revoked: "default",
};

function validUntil(k: LicenseKey, defaultDays: number) {
  if (!k.lastCheckAt) return null;
  const until = k.lastCheckAt.getTime() + (k.activationDays ?? defaultDays) * 86_400_000;
  return new Date(k.expiresAt ? Math.min(until, k.expiresAt.getTime()) : until);
}

export default async function KeysPage({ searchParams }: PageProps<"/admin/keys">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filter: KeyFilter = {
    q: one(sp.q) ?? "",
    status: (one(sp.status) as KeyFilter["status"]) ?? "all",
    productId: one(sp.product) ?? "all",
    type: (one(sp.type) as KeyFilter["type"]) ?? "all",
    page: Number(one(sp.page) ?? 1) || 1,
    pageSize: 50,
  };
  const [{ keys, total, page, pageSize }, stats, products, settings] = await Promise.all([listKeys(filter), keyStats(), listProducts(), getSettings()]);
  const productOptions = products.map((p) => ({ id: p.id, name: p.name }));
  const now = new Date().getTime(); // request time (server component, rendered per request)
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const qs = (patch: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const merged = { q: filter.q ?? "", status: filter.status ?? "all", product: filter.productId ?? "all", type: filter.type ?? "all", page: String(page), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all" && !(k === "page" && v === "1")) params.set(k, String(v));
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  const chips: { key: NonNullable<KeyFilter["status"]>; label: string; n: number }[] = [
    { key: "all", label: "All", n: stats.total },
    { key: "available", label: "Unused", n: stats.available },
    { key: "assigned", label: "Given out", n: stats.assigned },
    { key: "active", label: "Activated", n: stats.active },
    { key: "expired", label: "Expired", n: stats.expired },
    { key: "revoked", label: "Revoked", n: stats.revoked },
  ];

  return (
    <>
      <AdminHeader
        title="License keys"
        sub={`Each key works on one device. The plugin asks for the key again every ${settings.activationDays} days (change it in Settings).`}
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/admin/keys/export${qs({ page: 1 })}`}>
                <Download aria-hidden /> Export CSV
              </a>
            </Button>
            <GenerateKeys products={productOptions} />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.key}
            href={`/admin/keys${qs({ status: c.key, page: 1 })}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              (filter.status ?? "all") === c.key ? "border-[color-mix(in_oklab,var(--accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent-fg" : "border-border text-muted hover:text-fg",
            )}
          >
            {c.label} <span className="tabular-nums opacity-70">{c.n.toLocaleString("en-US")}</span>
          </Link>
        ))}
      </div>

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_140px_auto]" action="/admin/keys">
        <input type="hidden" name="status" value={filter.status ?? "all"} />
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="q" defaultValue={filter.q} placeholder="Search key, email, device, order…" className="ps-9" aria-label="Search keys" />
        </div>
        <Select name="product" defaultValue={filter.productId} aria-label="Product">
          <option value="all">Any product</option>
          <option value="universal">All-products keys</option>
          {productOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select name="type" defaultValue={filter.type} aria-label="Type">
          <option value="all">Paid + trial</option>
          <option value="paid">Paid</option>
          <option value="trial">Trial</option>
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Given to</th>
              <th className="px-4 py-3 font-medium">Device</th>
              <th className="px-4 py-3 font-medium">Next key entry</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No keys match.
                </td>
              </tr>
            ) : (
              keys.map((k) => {
                const until = validUntil(k, settings.activationDays);
                const view: KeyView = {
                  id: k.id,
                  key: k.key,
                  status: k.status,
                  trial: k.trial,
                  productId: k.productId,
                  productName: k.productName,
                  assignedTo: k.assignedTo,
                  note: k.note,
                  deviceName: k.deviceName,
                  deviceId: k.deviceId,
                  activatedAt: k.activatedAt?.toISOString() ?? null,
                  lastCheckAt: k.lastCheckAt?.toISOString() ?? null,
                  validUntil: until?.toISOString() ?? null,
                  expiresAt: k.expiresAt?.toISOString() ?? null,
                  activationDays: k.activationDays,
                  downloads: k.downloads,
                };
                const days = until ? Math.ceil((until.getTime() - now) / 86_400_000) : null;
                return (
                  <tr key={k.id} className="border-b border-border last:border-b-0 hover:bg-surface-2/40">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px]">
                      {k.key}
                      <CopyButton value={k.key} className="ms-1" />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <Badge size="sm" variant={STATUS_STYLE[k.status]} className={cn(k.status === "revoked" && "text-danger", k.status === "expired" && "text-warning")}>
                          {k.status}
                        </Badge>
                        {k.trial ? (
                          <Badge size="sm" variant="accent">
                            trial
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-fg-soft">{k.productName ?? <span className="text-muted">All products</span>}</td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-fg-soft">{k.assignedTo ?? <span className="text-muted">—</span>}</td>
                    <td className="max-w-[160px] truncate px-4 py-2.5 text-fg-soft">{k.deviceName ?? (k.deviceId ? "Device" : <span className="text-muted">—</span>)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {days === null ? <span className="text-muted">—</span> : days > 0 ? <span className="tabular-nums">in {days} d</span> : <span className="text-warning">due now</span>}
                    </td>
                    <td className="px-4 py-2.5 text-end">
                      <KeyManage k={view} products={productOptions} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <span>
          {total.toLocaleString("en-US")} keys · page {page} of {pages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/admin/keys${qs({ page: page - 1 })}`}>Previous</Link>
            </Button>
          ) : null}
          {page < pages ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/admin/keys${qs({ page: page + 1 })}`}>Next</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
