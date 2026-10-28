import Link from "next/link";
import { query } from "@/lib/server/db";
import { describeMethod, listRecentPayments } from "@/lib/server/payments";
import { formatAmount } from "@/lib/format";
import { AdminHeader, Card } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Payments" };

const TONE: Record<string, string> = {
  paid: "text-success",
  pending: "text-warning",
  created: "text-muted",
  failed: "text-danger",
  error: "text-danger",
  mismatch: "text-danger",
  refunded: "text-warning",
  voided: "text-warning",
};

export default async function PaymentsPage() {
  const [payments, totals] = await Promise.all([
    listRecentPayments(300),
    query<{ paid_30: string | null; paid_count_30: number; online_all: string | null; transfer_30: string | null }>(
      `SELECT
         (SELECT sum(total_cents) FROM orders WHERE status = 'paid' AND method = 'paymob' AND coalesce(paid_at, updated_at) > now() - interval '30 days') AS paid_30,
         (SELECT count(*)::int FROM orders WHERE status = 'paid' AND method = 'paymob' AND coalesce(paid_at, updated_at) > now() - interval '30 days') AS paid_count_30,
         (SELECT sum(total_cents) FROM orders WHERE status = 'paid' AND method = 'paymob') AS online_all,
         (SELECT sum(total_cents) FROM orders WHERE status = 'paid' AND method = 'instapay' AND coalesce(paid_at, updated_at) > now() - interval '30 days') AS transfer_30`,
    ),
  ]);
  const t = totals[0];
  const cents = (v: string | null | undefined) => Number(v ?? 0) / 100;
  const tiles = [
    { label: "Paid online — last 30 days", value: `EGP ${formatAmount(cents(t?.paid_30), true)}`, sub: `${t?.paid_count_30 ?? 0} payments` },
    { label: "InstaPay transfers — last 30 days", value: `EGP ${formatAmount(cents(t?.transfer_30), true)}`, sub: "confirmed by you" },
    { label: "Paid online — all time", value: `EGP ${formatAmount(cents(t?.online_all), true)}`, sub: "incl. VAT" },
  ];

  return (
    <>
      <AdminHeader title="Payments" sub="Every online payment attempt, as reported by Paymob. Successful payments issue keys automatically; anything odd (wrong amount, second payment, refund) is flagged here and emailed to you." />
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">{x.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{x.value}</p>
            <p className="mt-1 text-xs text-muted">{x.sub}</p>
          </div>
        ))}
      </div>

      <Card className="mt-6 overflow-x-auto p-0 sm:p-0">
        {payments.length === 0 ? (
          <p className="p-10 text-center text-muted">No online payments yet.</p>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted">
                <th className="px-4 py-3 text-start font-medium">When (UTC)</th>
                <th className="px-4 py-3 text-start font-medium">Order</th>
                <th className="px-4 py-3 text-start font-medium">Customer</th>
                <th className="px-4 py-3 text-start font-medium">Method</th>
                <th className="px-4 py-3 text-end font-medium">Amount</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3 text-start font-medium">Paymob transaction</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3 font-mono text-xs text-muted">{p.createdAt.slice(0, 16).replace("T", " ")}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders`} className="font-mono text-xs text-accent-fg underline-offset-4 hover:underline">
                      {p.orderId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{p.customerName}</span>
                    <span className="text-xs text-muted">{p.customerEmail}</span>
                  </td>
                  <td className="px-4 py-3">{describeMethod(p)}</td>
                  <td className="px-4 py-3 text-end tabular-nums">EGP {formatAmount(p.amount, true)}</td>
                  <td className="px-4 py-3">
                    <Badge size="sm" variant={p.status === "paid" ? "success" : "default"} className={cn(TONE[p.status])}>
                      {p.status}
                    </Badge>
                    {p.detail ? <span className="mt-1 block max-w-64 text-xs text-muted">{p.detail}</span> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{p.transactionId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
