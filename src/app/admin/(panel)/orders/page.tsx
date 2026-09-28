import Link from "next/link";
import { Check, X } from "lucide-react";
import { listOrders } from "@/lib/server/orders";
import { approveOrderAction, rejectOrderAction } from "@/app/admin/actions";
import { formatAmount } from "@/lib/format";
import { AdminHeader } from "@/components/admin/page-header";
import { CopyButton } from "@/components/admin/copy-button";
import { ComposeEmail } from "@/components/admin/compose-email";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const status = (typeof sp.status === "string" ? sp.status : "all") as "pending" | "paid" | "rejected" | "all";
  const orders = await listOrders(status);
  const tabs = ["all", "pending", "paid", "rejected"] as const;

  return (
    <>
      <AdminHeader title="Orders" sub="Customers pay by InstaPay and enter their transfer reference. Check the transfer in your bank app, then confirm to issue their product keys." />
      <div className="mb-5 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t}
            href={t === "all" ? "/admin/orders" : `/admin/orders?status=${t}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm capitalize",
              status === t ? "border-[color-mix(in_oklab,var(--accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent-fg" : "border-border text-muted hover:text-fg",
            )}
          >
            {t}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong p-10 text-center text-muted">No orders yet.</p>
      ) : (
        <ul className="grid gap-4">
          {orders.map((o) => (
            <li key={o.id} className={cn("rounded-2xl border bg-surface p-5", o.status === "pending" ? "border-[color-mix(in_oklab,var(--warning)_40%,var(--border))]" : "border-border")}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 font-mono text-sm">
                    {o.id}
                    <Badge size="sm" variant={o.status === "paid" ? "success" : o.status === "pending" ? "accent" : "default"}>
                      {o.status === "pending" ? "awaiting payment check" : o.status}
                    </Badge>
                  </p>
                  <p className="mt-1 text-xs text-muted">{new Date(o.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC</p>
                </div>
                <p className="text-end">
                  <span className="block text-2xl font-semibold tabular-nums">EGP {formatAmount(o.total, true)}</span>
                  <span className="text-xs text-muted">
                    incl. VAT {o.vatRate}% (EGP {formatAmount(o.vat, true)})
                  </span>
                </p>
              </div>

              <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted">Customer</p>
                  <p className="mt-1 font-medium">{o.customer.name}</p>
                  <p className="flex items-center gap-2 text-fg-soft">
                    {o.customer.email}
                    <ComposeEmail to={o.customer.email} name={o.customer.name} subject={`Your VEYLIX order ${o.id}`} variant="subtle" label="" />
                  </p>
                  <p className="font-mono text-fg-soft">{o.customer.phone}</p>
                  {o.business ? (
                    <p className="mt-1 text-xs text-muted">
                      {o.business.company} · Tax {o.business.taxId}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs text-muted">Items</p>
                  <ul className="mt-1 grid gap-0.5">
                    {o.items.map((i, idx) => (
                      <li key={idx}>
                        {i.quantity} × {i.name} <span className="text-muted">({i.billing})</span>
                      </li>
                    ))}
                  </ul>
                  {o.renewKey ? <p className="mt-1 text-xs text-muted">Renewing {o.renewKey}</p> : null}
                </div>
                <div>
                  <p className="text-xs text-muted">InstaPay reference</p>
                  <p className="mt-1 flex items-center gap-1 font-mono">
                    {o.paymentRef || "—"}
                    {o.paymentRef ? <CopyButton value={o.paymentRef} /> : null}
                  </p>
                </div>
              </div>

              {o.status === "paid" && o.licenseKeys.length ? (
                <div className="mt-4 rounded-xl border border-border bg-bg-elevated p-3">
                  <p className="text-xs text-muted">Issued keys</p>
                  <ul className="mt-1 grid gap-1 font-mono text-sm">
                    {o.licenseKeys.map((k) => (
                      <li key={k.key} className="flex items-center gap-2">
                        {k.key}
                        <CopyButton value={k.key} />
                        <span className="font-sans text-xs text-muted">
                          {k.productName}
                          {k.renewed ? " · renewed" : ""} · until {k.expiresAt?.slice(0, 10)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {o.status === "rejected" && o.adminNote ? <p className="mt-3 text-sm text-muted">Note: {o.adminNote}</p> : null}

              {o.status === "pending" ? (
                <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                  <form action={approveOrderAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <Button type="submit" size="sm">
                      <Check aria-hidden /> Payment received — issue keys
                    </Button>
                  </form>
                  <form action={rejectOrderAction} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={o.id} />
                    <Input name="note" placeholder="Reason (optional)" className="h-9 w-56" aria-label="Rejection reason" />
                    <label className="inline-flex h-9 items-center gap-1.5 text-xs text-muted">
                      <input type="checkbox" name="notify" defaultChecked className="size-4 accent-[var(--accent)]" /> Email customer
                    </label>
                    <Button type="submit" size="sm" variant="ghost" className="text-danger">
                      <X aria-hidden /> Reject
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
