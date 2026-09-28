"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCircle2, Clock, Copy, Download, KeyRound, Package, Printer } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { products, type PurchasablePlanId } from "@/lib/catalog";
import { formatDate, formatEGP } from "@/lib/format";
import { href } from "@/lib/links";
import { ORDER_STORAGE_KEY, type Order } from "@/lib/order";
import { currentRelease, contact } from "@/lib/site";
import { fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

const noop = () => () => {};
function readOrder(): string | null {
  try {
    return sessionStorage.getItem(ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function CopyButton({ value, t }: { value: string; t: Pick<Dictionary["common"], "copy" | "copied"> }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
    >
      {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? t.copied : t.copy}
    </button>
  );
}

export function OrderSuccess({
  locale,
  t,
  common,
  planNames,
  totalsLabels,
}: {
  locale: Locale;
  t: Dictionary["success"];
  common: Dictionary["common"];
  planNames: Record<PurchasablePlanId, string>;
  totalsLabels: Pick<Dictionary["checkout"], "subtotal" | "vat" | "total">;
}) {
  const raw = React.useSyncExternalStore(noop, readOrder, () => null);
  const order = React.useMemo<Order | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Order;
    } catch {
      return null;
    }
  }, [raw]);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-10 text-center">
        <LogoMark className="mx-auto size-14" />
        <p className="mt-6 text-muted">{fill(t.missing, { email: contact.support })}</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href={href(locale)}>{common.back}</Link>
        </Button>
      </div>
    );
  }

  const pending = order.status === "pending";
  const keys = order.items.flatMap((i) => i.licenseKeys.map((k) => ({ key: k, item: i })));

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_12%,transparent)] shadow-[0_0_40px_-8px_var(--success)]">
          {pending ? <Clock className="size-7 text-warning" aria-hidden /> : <CheckCircle2 className="size-7 text-success" aria-hidden />}
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{pending ? t.pendingTitle : t.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          {pending ? fill(t.fawryPending, { code: order.fawryReference ?? "" }) : fill(t.sub, { email: order.customer.email })}
        </p>
        <p className="mt-3 font-mono text-xs text-muted">
          {t.order} <span className="ltr text-fg">{order.id}</span>
        </p>
      </div>

      {pending && order.fawryReference ? (
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Fawry</p>
          <p className="ltr mt-2 font-mono text-4xl font-semibold tracking-[0.15em] text-fg">{order.fawryReference}</p>
          <div className="mt-4 flex justify-center">
            <CopyButton value={order.fawryReference} t={common} />
          </div>
        </div>
      ) : null}

      {!pending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <KeyRound className="size-4 text-accent-fg" aria-hidden />
              {t.keys}
            </h2>
            <ul className="mt-5 grid gap-2">
              {keys.map(({ key, item }) => (
                <li key={key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
                  <div className="min-w-0">
                    <p className="ltr truncate font-mono text-sm font-semibold tracking-wider text-fg">{key}</p>
                    <p className="text-xs text-muted">
                      <span className="ltr">
                        VEYLIX {planNames[item.plan]}
                        {item.plugin ? ` · ${products[item.plugin].name}` : ""}
                      </span>
                    </p>
                  </div>
                  <CopyButton value={key} t={common} />
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col rounded-2xl border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Package className="size-4 text-accent-fg" aria-hidden />
              {t.downloads}
            </h2>
            <ul className="mt-5 grid gap-2">
              <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{t.installer}</p>
                  <p className="ltr font-mono text-xs text-muted">{fill(t.installerMeta, { version: currentRelease.version })}</p>
                </div>
                <Button asChild size="sm">
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route, not a page */}
                  <a href="/api/download/suite">
                    <Download aria-hidden />
                    {t.download}
                  </a>
                </Button>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
                <p className="text-sm font-medium">{t.msi}</p>
                <Button asChild size="sm" variant="secondary">
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route, not a page */}
                  <a href="/api/download/msi">
                    <Download aria-hidden />
                    MSI
                  </a>
                </Button>
              </li>
            </ul>
            <h3 className="mt-6 text-sm font-semibold">{t.next}</h3>
            <ol className="mt-3 grid gap-2">
              {t.steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-fg-soft">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono text-[11px]">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}

      {/* Tax invoice */}
      <section id="tax-invoice" className="rounded-2xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="invoice-title">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" glow={false} />
            <div>
              <h2 id="invoice-title" className="text-lg font-semibold">
                {t.invoice} <span className="text-muted">· فاتورة ضريبية</span>
              </h2>
              <p className="font-mono text-xs text-muted">
                {t.invoiceNo} <span className="ltr text-fg">{order.invoice.number}</span> · {t.issued} {formatDate(order.createdAt, locale)}
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer aria-hidden />
            {t.printInvoice}
          </Button>
        </div>

        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{t.seller}</p>
            <p dir="auto" className="mt-2 font-medium">{order.invoice.seller.name}</p>
            <p dir="auto" className="text-sm text-muted">{order.invoice.seller.address}</p>
            {order.invoice.seller.taxId ? (
              <p className="text-sm text-muted">
                {t.taxId}: <span className="ltr">{order.invoice.seller.taxId}</span>
              </p>
            ) : null}
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{t.billedTo}</p>
            <p dir="auto" className="mt-2 font-medium">{order.business?.company || order.customer.name}</p>
            {order.business?.address ? <p dir="auto" className="text-sm text-muted">{order.business.address}</p> : null}
            {order.business?.taxId ? (
              <p className="text-sm text-muted">
                {t.taxId}: <span className="ltr">{order.business.taxId}</span>
              </p>
            ) : null}
            <p className="ltr text-sm text-muted">{order.customer.email}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-y border-border text-xs text-muted">
                <th scope="col" className="py-2.5 text-start font-medium">{t.item}</th>
                <th scope="col" className="py-2.5 text-center font-medium">{t.qty}</th>
                <th scope="col" className="py-2.5 text-end font-medium">{t.amount}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-3">
                    <span className="ltr">
                      VEYLIX {planNames[item.plan]}
                      {item.plugin ? ` — ${products[item.plugin].name}` : ""}
                    </span>
                    <span className="text-muted"> · {item.billing === "monthly" ? common.monthly : common.yearly}</span>
                  </td>
                  <td className="py-3 text-center tabular-nums">{item.quantity}</td>
                  <td className="py-3 text-end tabular-nums">{formatEGP(item.lineTotal, locale, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ms-auto mt-4 grid max-w-xs gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{totalsLabels.subtotal}</dt>
            <dd className="tabular-nums">{formatEGP(order.subtotal, locale, true)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{totalsLabels.vat}</dt>
            <dd className="tabular-nums">{formatEGP(order.vat, locale, true)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <dt>{totalsLabels.total}</dt>
            <dd className="tabular-nums">{formatEGP(order.total, locale, true)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
