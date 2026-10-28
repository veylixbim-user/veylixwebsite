import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, CheckCircle2, Clock, Download, KeyRound, ShieldCheck, XCircle } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getOrderForCustomer } from "@/lib/server/orders";
import { getSettingsSafe } from "@/lib/server/settings";
import { describeMethod, methodAvailability, paymentsForOrder } from "@/lib/server/payments";
import { storedOrderToken } from "@/lib/server/order-access";
import { qrSvg } from "@/lib/server/qr";
import { formatDate, formatEGP } from "@/lib/format";
import { href } from "@/lib/links";
import { contact } from "@/lib/site";
import { fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { CopyInline } from "@/components/forms/copy-inline";
import { PrintButton } from "@/components/sections/print-button";
import { PayPanel } from "@/components/forms/pay-panel";
import { OrderWatcher } from "@/components/forms/order-watcher";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const minutesSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60_000;

export async function generateMetadata({ params }: PageProps<"/[locale]/order/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: id, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/order/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  // The link's token, or the one kept in this browser when the order was placed (so coming back from the payment page works).
  const token = (typeof sp.t === "string" && sp.t) || (await storedOrderToken(id));
  const [dict, settings, order] = await Promise.all([getDictionary(locale), getSettingsSafe(), getOrderForCustomer(id, token).catch(() => null)]);
  const t = dict.order;

  if (!order) {
    return (
      <div className="container-page max-w-xl pt-36 pb-8 text-center">
        <LogoMark className="mx-auto size-14" />
        <p className="mt-6 text-muted">{fill(t.notFound, { email: contact.support })}</p>
        <p className="mt-3 text-sm text-muted">{t.noAccess}</p>
      </div>
    );
  }

  const payments = await paymentsForOrder(order.id).catch(() => []);
  const latest = payments[0];
  const online = order.method === "paymob";
  const methods = methodAvailability(settings);
  // A payment counts as "in progress" for half an hour after the customer opened the payment page.
  const fresh = latest ? minutesSince(latest.updatedAt) < 30 : false;
  const inProgress = online && order.status === "pending" && !!latest && (latest.status === "pending" || (latest.status === "created" && fresh));
  const needsPayment = online && order.status === "pending" && !inProgress;
  const failed = latest?.status === "failed" || latest?.status === "mismatch";
  const notice: "failed" | "gateway" | null = needsPayment ? (failed ? "failed" : sp.pay === "retry" || latest?.status === "error" ? "gateway" : null) : null;
  const waitingKiosk = inProgress && (latest?.method === "kiosk" || (latest?.method ?? "").startsWith("aggregator"));

  const Icon = order.status === "paid" ? CheckCircle2 : order.status === "pending" ? Clock : XCircle;
  const title =
    order.status === "paid" ? t.paidTitle : order.status === "rejected" ? t.rejectedTitle : needsPayment ? t.payTitle : inProgress ? t.confirmingTitle : t.pendingTitle;
  const body =
    order.status === "paid"
      ? t.paidBody
      : order.status === "rejected"
        ? fill(t.rejectedBody, { email: contact.support })
        : needsPayment
          ? t.payBody
          : inProgress
            ? waitingKiosk
              ? t.confirmingKiosk
              : t.confirmingBody
            : t.pendingBody;
  const slugs = [...new Set(order.items.map((i) => i.slug))];
  const paidOnline = order.status === "paid" && online;
  const steps: { label: string; state: "done" | "current" | "todo" | "failed" }[] = [
    { label: t.progress.placed, state: "done" },
    { label: t.progress.payment, state: order.status === "paid" ? "done" : order.status === "rejected" ? "failed" : "current" },
    { label: t.progress.keys, state: order.status === "paid" ? "done" : "todo" },
  ];

  return (
    <div className="container-page max-w-4xl pt-28 pb-8 sm:pt-36">
      <ol aria-label={fill(t.title, { id: order.id })} className="mx-auto mb-10 flex max-w-md items-center justify-center">
        {steps.map((step, i) => (
          <li key={step.label} className="flex flex-1 items-center last:flex-none">
            <span className="flex flex-col items-center gap-1.5 text-center">
              <span
                aria-current={step.state === "current" ? "step" : undefined}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
                  step.state === "done" && "border-[color-mix(in_oklab,var(--success)_60%,transparent)] bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success",
                  step.state === "current" && "border-[color-mix(in_oklab,var(--accent)_70%,transparent)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-accent-fg shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_14%,transparent)]",
                  step.state === "todo" && "border-border-strong text-muted",
                  step.state === "failed" && "border-[color-mix(in_oklab,var(--danger)_60%,transparent)] bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger",
                )}
              >
                {step.state === "done" ? <Check className="size-4" aria-hidden /> : step.state === "failed" ? <XCircle className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-[11px]", step.state === "todo" ? "text-muted" : "text-fg-soft")}>{step.label}</span>
            </span>
            {i < steps.length - 1 ? <span aria-hidden className={cn("mx-2 mb-5 h-px flex-1", step.state === "done" ? "bg-[color-mix(in_oklab,var(--success)_50%,transparent)]" : "bg-border-strong")} /> : null}
          </li>
        ))}
      </ol>
      <div className="text-center">
        <span
          className={`mx-auto inline-flex size-16 items-center justify-center rounded-full border ${
            order.status === "paid"
              ? "border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-success"
              : order.status === "pending"
                ? "border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] text-warning"
                : "border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] text-danger"
          }`}
        >
          <Icon className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{body}</p>
        <p className="mt-3 font-mono text-xs text-muted">{fill(t.title, { id: order.id })}</p>
      </div>

      {inProgress && token ? <OrderWatcher id={order.id} token={token} initialPayment={latest?.status ?? null} label={t.confirmingTitle} /> : null}

      {online && order.status === "pending" && token ? (
        <PayPanel
          orderId={order.id}
          token={token}
          totalLabel={formatEGP(order.total, locale, true)}
          methods={methods}
          t={dict.checkout}
          o={t}
          instapay={{ number: settings.instapayNumber, name: settings.instapayName, link: settings.instapayLink, qr: await qrSvg(settings.instapayLink) }}
          notice={notice}
          folded={inProgress}
        />
      ) : null}

      {order.status === "pending" && !online ? (
        <div className="mx-auto mt-10 grid max-w-xl gap-4 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">{t.amountDue}</span>
            <span className="text-2xl font-semibold tabular-nums">{formatEGP(order.total, locale, true)}</span>
          </div>
          <div className="text-sm">
            <p className="mb-1.5 text-muted">InstaPay</p>
            <CopyInline value={settings.instapayNumber} />
          </div>
          <p className="text-sm text-muted">
            {t.reference}: <span className="ltr font-mono text-fg">{order.paymentRef}</span>
          </p>
          <p className="rounded-xl border border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] px-4 py-3 text-sm text-warning">{t.bookmark}</p>
        </div>
      ) : null}

      {paidOnline ? (
        <p className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-4 py-1.5 text-xs text-success">
          <ShieldCheck className="size-3.5" aria-hidden /> {t.paidOnline}
          {latest ? <span className="text-muted">· {describeMethod(latest)}</span> : null}
        </p>
      ) : null}

      {order.status === "paid" ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <KeyRound className="size-4 text-accent-fg" aria-hidden /> {t.keys}
            </h2>
            <ul className="mt-5 grid gap-3">
              {order.licenseKeys.map((k) => (
                <li key={k.key}>
                  <p className="mb-1.5 flex items-center justify-between text-xs text-muted">
                    <span className="ltr">{k.productName}</span>
                    <span>
                      {k.renewed ? `${t.renewed} · ` : ""}
                      {k.expiresAt ? fill(t.validUntil, { date: formatDate(k.expiresAt, locale) }) : ""}
                    </span>
                  </p>
                  <CopyInline value={k.key} />
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col rounded-2xl border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Download className="size-4 text-accent-fg" aria-hidden /> {t.downloads}
            </h2>
            <p className="mt-1 text-sm text-muted">{t.downloadHint}</p>
            <div className="mt-4 grid gap-2">
              {slugs.map((slug) => (
                <Button key={slug} asChild variant="secondary">
                  <Link href={`${href(locale, "/download")}?product=${slug}#${slug}`}>
                    <Download aria-hidden /> {order.items.find((i) => i.slug === slug)?.name}
                  </Link>
                </Button>
              ))}
            </div>
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

      {order.status === "paid" ? (
        <section id="tax-invoice" className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="invoice-title">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-3">
              <LogoMark className="size-10" glow={false} />
              <div>
                <h2 id="invoice-title" className="text-lg font-semibold">
                  {t.invoice} <span className="text-muted">· فاتورة ضريبية</span>
                </h2>
                <p className="font-mono text-xs text-muted">
                  {t.invoiceNo} <span className="ltr text-fg">{order.invoiceNumber}</span> · {t.issued} {formatDate(order.updatedAt, locale)}
                </p>
              </div>
            </div>
            <PrintButton label={t.printInvoice} />
          </div>
          <div className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{t.seller}</p>
              <p dir="auto" className="mt-2 font-medium">
                {process.env.SELLER_LEGAL_NAME || "VEYLIX"}
              </p>
              <p dir="auto" className="text-sm text-muted">
                {process.env.SELLER_ADDRESS || "Cairo, Egypt"}
              </p>
              {process.env.SELLER_TAX_ID ? (
                <p className="text-sm text-muted">
                  {t.taxId}: <span className="ltr">{process.env.SELLER_TAX_ID}</span>
                </p>
              ) : null}
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{t.billedTo}</p>
              <p dir="auto" className="mt-2 font-medium">
                {order.business?.company || order.customer.name}
              </p>
              {order.business?.address ? (
                <p dir="auto" className="text-sm text-muted">
                  {order.business.address}
                </p>
              ) : null}
              {order.business?.taxId ? (
                <p className="text-sm text-muted">
                  {t.taxId}: <span className="ltr">{order.business.taxId}</span>
                </p>
              ) : null}
              <p className="ltr text-sm text-muted">{order.customer.email}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-sm">
              <thead>
                <tr className="border-y border-border text-xs text-muted">
                  <th scope="col" className="py-2.5 text-start font-medium">
                    {t.item}
                  </th>
                  <th scope="col" className="py-2.5 text-center font-medium">
                    {t.qty}
                  </th>
                  <th scope="col" className="py-2.5 text-end font-medium">
                    {t.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-3">
                      <span className="ltr">{item.name}</span>
                      <span className="text-muted"> · {item.billing === "monthly" ? dict.common.monthly : dict.common.yearly}</span>
                    </td>
                    <td className="py-3 text-center tabular-nums">{item.quantity}</td>
                    <td className="py-3 text-end tabular-nums">{formatEGP(item.unitPrice * item.quantity, locale, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="ms-auto mt-4 grid max-w-xs gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{dict.checkout.subtotal}</dt>
              <dd className="tabular-nums">{formatEGP(order.subtotal, locale, true)}</dd>
            </div>
            {order.vatRate > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted">{fill(dict.checkout.vat, { rate: order.vatRate })}</dt>
                <dd className="tabular-nums">{formatEGP(order.vat, locale, true)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <dt>{dict.checkout.total}</dt>
              <dd className="tabular-nums">{formatEGP(order.total, locale, true)}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
