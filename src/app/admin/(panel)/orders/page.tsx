import Link from "next/link";
import { Check, RefreshCw, X } from "lucide-react";
import { listOrders, type OrderFilter } from "@/lib/server/orders";
import { listProducts } from "@/lib/server/products";
import { describeMethod, methodAvailability, paymentsForOrders, type Payment } from "@/lib/server/payments";
import { getSettings } from "@/lib/server/settings";
import { paymobEnv } from "@/lib/server/paymob";
import { anyOnline } from "@/lib/payment-methods";
import { approveOrderAction, recheckPaymentAction, rejectOrderAction } from "@/app/admin/actions";
import { formatAmount } from "@/lib/format";
import { AdminHeader } from "@/components/admin/page-header";
import { CopyButton } from "@/components/admin/copy-button";
import { ComposeEmail } from "@/components/admin/compose-email";
import { NewPaymentLink } from "@/components/admin/new-payment-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TABS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Needs your check" },
  { id: "online", label: "Online — unpaid" },
  { id: "paid", label: "Paid" },
  { id: "rejected", label: "Rejected" },
];

const PAYMENT_TONE: Record<Payment["status"], string> = {
  created: "text-muted",
  pending: "text-warning",
  paid: "text-success",
  failed: "text-danger",
  refunded: "text-warning",
  voided: "text-warning",
  error: "text-danger",
  mismatch: "text-danger",
};

const PAYMENT_TEXT: Record<Payment["status"], string> = {
  created: "opened the payment page",
  pending: "waiting for the bank / Fawry",
  paid: "paid",
  failed: "declined",
  refunded: "refunded",
  voided: "voided",
  error: "could not be started",
  mismatch: "wrong amount — needs a look",
};

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const requested = typeof sp.status === "string" ? sp.status : "all";
  const status = (TABS.some((t) => t.id === requested) ? requested : "all") as OrderFilter;
  const [orders, products, settings] = await Promise.all([listOrders(status), listProducts(), getSettings()]);
  const payments = await paymentsForOrders(orders.map((o) => o.id));
  const env = paymobEnv();
  const onlineReady = Boolean(env) && anyOnline(methodAvailability(settings));

  return (
    <>
      <AdminHeader
        title="Orders"
        sub="Online payments (card, wallet, Fawry, InstaPay) are confirmed automatically and their keys are sent for you. InstaPay transfers wait here for you to check them in your bank app."
        actions={<NewPaymentLink products={products.filter((p) => p.priceMonthly || p.priceYearly)} onlineReady={onlineReady} />}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "all" ? "/admin/orders" : `/admin/orders?status=${t.id}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              status === t.id ? "border-[color-mix(in_oklab,var(--accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent-fg" : "border-border text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong p-10 text-center text-muted">No orders here yet.</p>
      ) : (
        <ul className="grid gap-4">
          {orders.map((o) => {
            const list = payments.get(o.id) ?? [];
            const latest = list[0];
            const online = o.method === "paymob";
            const unpaidOnline = online && o.status === "pending" && !o.paymentRef;
            const needsCheck = o.status === "pending" && !unpaidOnline;
            const flagged = list.some((p) => p.status === "mismatch" || p.status === "refunded" || p.status === "voided") || (o.status === "paid" && list.filter((p) => p.status === "paid").length > 1);
            return (
              <li key={o.id} className={cn("rounded-2xl border bg-surface p-5", needsCheck || flagged ? "border-[color-mix(in_oklab,var(--warning)_40%,var(--border))]" : "border-border")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-mono text-sm">
                      {o.id}
                      <Badge size="sm" variant={o.status === "paid" ? "success" : o.status === "pending" ? "accent" : "default"}>
                        {o.status === "pending" ? (unpaidOnline ? "not paid yet" : "awaiting your check") : o.status}
                      </Badge>
                      <Badge size="sm" variant={online ? "violet" : "default"}>
                        {online ? "online" : "InstaPay transfer"}
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
                    <p className="text-xs text-muted">{online ? "Payment" : "InstaPay reference"}</p>
                    {online && latest ? (
                      <p className="mt-1">
                        <span className="font-medium">{describeMethod(latest)}</span> · <span className={PAYMENT_TONE[latest.status]}>{PAYMENT_TEXT[latest.status]}</span>
                      </p>
                    ) : online ? (
                      <p className="mt-1 text-muted">Customer hasn&apos;t opened the payment page.</p>
                    ) : null}
                    {o.paymentRef ? (
                      <p className="mt-1 flex items-center gap-1 font-mono">
                        {o.paymentRef}
                        <CopyButton value={o.paymentRef} />
                      </p>
                    ) : null}
                    {list.length > 1 ? <p className="mt-1 text-xs text-muted">{list.length} attempts</p> : null}
                  </div>
                </div>

                {list.some((p) => p.detail) ? (
                  <ul className="mt-3 grid gap-1 text-xs">
                    {list
                      .filter((p) => p.detail)
                      .slice(0, 3)
                      .map((p) => (
                        <li key={p.id} className={cn("rounded-lg border px-3 py-2", p.status === "mismatch" || p.status === "error" ? "border-[color-mix(in_oklab,var(--danger)_40%,var(--border))] text-danger" : "border-border text-muted")}>
                          {p.detail}
                        </li>
                      ))}
                  </ul>
                ) : null}

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
                    {online && list.some((p) => p.status === "created" || p.status === "pending") ? (
                      <form action={recheckPaymentAction}>
                        <input type="hidden" name="id" value={o.id} />
                        <Button type="submit" size="sm" variant="secondary" title="Asks Paymob whether the customer's payment went through">
                          <RefreshCw aria-hidden /> Check with Paymob
                        </Button>
                      </form>
                    ) : null}
                    <form action={approveOrderAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <Button type="submit" size="sm" variant={needsCheck ? "primary" : "ghost"}>
                        <Check aria-hidden /> {online ? "Mark as paid (I checked Paymob)" : "Payment received — issue keys"}
                      </Button>
                    </form>
                    <form action={rejectOrderAction} className="flex items-end gap-2">
                      <input type="hidden" name="id" value={o.id} />
                      <Input name="note" placeholder="Reason (optional)" className="h-9 w-56" aria-label="Rejection reason" />
                      <label className="inline-flex h-9 items-center gap-1.5 text-xs text-muted">
                        <input type="checkbox" name="notify" defaultChecked className="size-4 accent-[var(--accent)]" /> Email customer
                      </label>
                      <Button type="submit" size="sm" variant="ghost" className="text-danger">
                        <X aria-hidden /> {online ? "Cancel order" : "Reject"}
                      </Button>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
