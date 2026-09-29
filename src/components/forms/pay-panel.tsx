"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, CreditCard, ExternalLink, Landmark, Loader2, Lock, Store, Wallet, Zap } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ONLINE_METHODS, type MethodAvailability, type OnlineMethod } from "@/lib/payment-methods";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { CopyInline } from "@/components/forms/copy-inline";

const ICON: Record<OnlineMethod, React.ComponentType<{ className?: string }>> = { card: CreditCard, wallet: Wallet, instapay: Zap, kiosk: Store, installments: CalendarClock };

type Props = {
  orderId: string;
  token: string;
  totalLabel: string;
  methods: MethodAvailability;
  t: Dictionary["checkout"];
  o: Dictionary["order"];
  instapay: { number: string; name: string; link: string; qr: string };
  /** "failed" = last payment was declined, "gateway" = the payment page couldn't be opened, otherwise none. */
  notice: "failed" | "gateway" | null;
  /** Show the panel folded (someone is already paying) instead of open. */
  folded?: boolean;
};

/** Lets a customer (re)start payment for an order that isn't paid yet — online, or by manual InstaPay transfer. */
export function PayPanel({ orderId, token, totalLabel, methods, t, o, instapay, notice, folded = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<OnlineMethod | "manual" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ref, setRef] = React.useState("");
  const [refError, setRefError] = React.useState<string | null>(null);

  const errText = (code: string) => (t.errors as Record<string, string>)[code] ?? t.errors.generic;
  const online = ONLINE_METHODS.filter((m) => methods[m]);

  async function start(method: OnlineMethod) {
    setBusy(method);
    setError(null);
    try {
      const res = await fetch("/api/pay/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, token, method }) });
      const data = (await res.json()) as { ok: boolean; url?: string; errors?: Record<string, string> };
      if (data.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(errText(data.errors?.form ?? "generic"));
    } catch {
      setError(t.errors.generic);
    }
    setBusy(null);
  }

  async function sendManual(e: React.SyntheticEvent) {
    e.preventDefault();
    if (ref.trim().length < 4) {
      setRefError(t.errors.paymentRef);
      return;
    }
    setBusy("manual");
    setRefError(null);
    try {
      const res = await fetch("/api/pay/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, token, paymentRef: ref }) });
      const data = (await res.json()) as { ok: boolean; errors?: Record<string, string> };
      if (data.ok) {
        router.refresh();
        return;
      }
      setRefError(errText(data.errors?.paymentRef ?? data.errors?.form ?? "generic"));
    } catch {
      setRefError(t.errors.generic);
    }
    setBusy(null);
  }

  const body = (
    <div className="grid gap-5">
      {notice ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--warning)_45%,var(--border))] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-3.5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            <b className="block">{notice === "failed" ? o.failedTitle : t.errors.gateway}</b>
            {notice === "failed" ? o.failedBody : null}
          </span>
        </p>
      ) : null}

      {online.length > 0 ? (
        <div>
          <p className="mb-3 text-sm font-medium text-fg-soft">{o.payBody}</p>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {online.map((m) => {
              const Icon = ICON[m];
              const info = t.method[m];
              return (
                <li key={m}>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => start(m)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-start transition-colors",
                      "hover:border-[color-mix(in_oklab,var(--accent)_55%,var(--border))] hover:bg-surface-2 focus-visible:outline-none focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_22%,transparent)] disabled:opacity-60",
                    )}
                  >
                    <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent-fg">
                      {busy === m ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <Icon className="size-[18px]" aria-hidden />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-fg">
                        {o.payWith} {info.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{info.body}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Lock className="size-3.5 text-success" aria-hidden /> {t.secureOnline}
          </p>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {methods.transfer ? (
        <details className="group rounded-xl border border-border bg-bg-elevated/50 p-4" open={online.length === 0}>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-fg-soft [&::-webkit-details-marker]:hidden">
            <Landmark className="size-4 text-accent-fg" aria-hidden /> {o.orTransfer}
          </summary>
          <form onSubmit={sendManual} className="mt-4 grid gap-4 text-sm" noValidate>
            <p className="text-fg-soft">
              {t.instapay.step1} <b className="text-fg">{totalLabel}</b> {t.instapay.step2}
            </p>
            <CopyInline value={instapay.number} />
            {instapay.name ? (
              <span className="text-xs text-muted">
                {t.instapay.accountName}: <span className="text-fg-soft">{instapay.name}</span>
              </span>
            ) : null}
            {instapay.link ? (
              <div className="flex flex-wrap items-center gap-4">
                <Button asChild variant="secondary" size="sm">
                  <a href={instapay.link} target="_blank" rel="noopener noreferrer">
                    {t.instapay.openApp} <ExternalLink aria-hidden />
                  </a>
                </Button>
                {instapay.qr ? <div role="img" aria-label={t.instapay.scan} className="size-24 shrink-0 rounded-lg bg-white p-1.5 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: instapay.qr }} /> : null}
              </div>
            ) : null}
            <Field label={t.instapay.reference} htmlFor="pp-ref" hint={t.instapay.referenceHint} error={refError ?? undefined}>
              <Input id="pp-ref" dir="ltr" autoComplete="off" value={ref} onChange={(e) => setRef(e.target.value)} aria-invalid={!!refError} className="font-mono" />
            </Field>
            <Button type="submit" variant="secondary" disabled={busy !== null} className="justify-self-start">
              {busy === "manual" ? <Loader2 className="animate-spin" aria-hidden /> : null} {o.transferSend}
            </Button>
          </form>
        </details>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-surface p-6">
      {folded ? (
        <details>
          <summary className="cursor-pointer list-none text-sm font-medium text-accent-fg [&::-webkit-details-marker]:hidden">{o.payTitle}</summary>
          <div className="mt-4">{body}</div>
        </details>
      ) : (
        <>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">{o.payTitle}</h2>
          {body}
        </>
      )}
    </div>
  );
}
