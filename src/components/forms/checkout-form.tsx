"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CalendarClock, CreditCard, ExternalLink, Landmark, Loader2, Lock, RefreshCw, ShieldCheck, Store, Wallet, Zap } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { cartStore } from "@/lib/cart-store";
import { formatEGP } from "@/lib/format";
import { href } from "@/lib/links";
import { cartTotals, priceOf } from "@/lib/pricing";
import { PAYMENT_METHODS, type PaymentChoice } from "@/lib/payment-methods";
import { cn, fill } from "@/lib/utils";
import { EG_MOBILE_RE, EMAIL_RE, normalizePhone, normalizeTaxId, TAX_ID_RE } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ProductThumb } from "@/components/brand/product-thumb";
import { MastercardMark, VisaMark } from "@/components/brand/payment-marks";
import { CopyInline } from "@/components/forms/copy-inline";
import { useCart, useUI } from "@/components/providers/site-providers";

/** Device ID of the PC the customer came from (set when they click "Buy" inside the Revit plugin). */
function readDevice(): string | undefined {
  try {
    return window.sessionStorage.getItem("veylix-device") ?? undefined;
  } catch {
    return undefined;
  }
}

const CONTACT_KEY = "veylix-contact";
const nowMs = () => Date.now();

type Saved = { name?: string; email?: string; phone?: string };

/** What this browser remembered from the last order (read without touching state, so there is no flash or extra render). */
function subscribeNothing() {
  return () => {};
}
function readSavedContact(): string {
  try {
    return window.localStorage.getItem(CONTACT_KEY) ?? "";
  } catch {
    return "";
  }
}

const METHOD_ICON: Record<PaymentChoice, React.ComponentType<{ className?: string }>> = {
  card: CreditCard,
  wallet: Wallet,
  instapay: Zap,
  kiosk: Store,
  installments: CalendarClock,
  transfer: Landmark,
};

type Props = {
  locale: Locale;
  t: Dictionary["checkout"];
  cart: Dictionary["cart"];
  common: Dictionary["common"];
};

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5 text-base font-semibold">
      <span aria-hidden className="inline-flex size-6 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] font-mono text-xs text-accent-fg">
        {n}
      </span>
      {children}
    </span>
  );
}

export function CheckoutForm({ locale, t, cart, common }: Props) {
  const router = useRouter();
  const items = useCart();
  const { catalog, shop } = useUI();
  const lines = items.filter((i) => priceOf(catalog.get(i.productId), i.billing) != null);
  const { subtotal, vat, total } = cartTotals(lines, catalog, shop.vatRate);

  const available = PAYMENT_METHODS.filter((m) => shop.methods[m]);
  const [method, setMethod] = React.useState<PaymentChoice>(available[0] ?? "transfer");
  const online = method !== "transfer";

  const savedJson = React.useSyncExternalStore(subscribeNothing, readSavedContact, () => "");
  const saved = React.useMemo<Saved>(() => {
    try {
      return savedJson ? (JSON.parse(savedJson) as Saved) : {};
    } catch {
      return {};
    }
  }, [savedJson]);
  // Only what the customer typed lives in state; the remembered contact details show through until they edit them.
  const [typed, setTyped] = React.useState<Partial<Record<"name" | "email" | "phone" | "company" | "taxId" | "address" | "paymentRef" | "renewKey", string>>>({});
  const values = {
    name: typed.name ?? saved.name ?? "",
    email: typed.email ?? saved.email ?? "",
    phone: typed.phone ?? saved.phone ?? "",
    company: typed.company ?? "",
    taxId: typed.taxId ?? "",
    address: typed.address ?? "",
    paymentRef: typed.paymentRef ?? "",
    renewKey: typed.renewKey ?? "",
  };
  const [business, setBusiness] = React.useState(false);
  const [renew, setRenew] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  /** Plugins this email already owns (server asked us to confirm the purchase is for another PC). */
  const [owned, setOwned] = React.useState<string[] | null>(null);
  const [honeypot, setHoneypot] = React.useState("");
  const mountedAt = React.useRef(0);

  // Bots fill forms within a blink; people don't. The server compares this with the time the form was submitted.
  React.useEffect(() => {
    mountedAt.current = nowMs();
  }, []);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTyped((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key])
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
  };

  function validate() {
    const e: Record<string, string> = {};
    if (values.name.trim().length < 2) e.name = t.errors.name;
    if (!EMAIL_RE.test(values.email.trim())) e.email = t.errors.email;
    if (!EG_MOBILE_RE.test(normalizePhone(values.phone))) e.phone = t.errors.phone;
    if (!online && values.paymentRef.trim().length < 4) e.paymentRef = t.errors.paymentRef;
    if (business) {
      if (values.company.trim().length < 2) e.company = t.errors.company;
      if (!TAX_ID_RE.test(normalizeTaxId(values.taxId))) e.taxId = t.errors.taxId;
    }
    if (renew && values.renewKey.trim().length < 10) e.renewKey = t.errors.renewKey;
    return e;
  }

  async function onSubmit(ev: React.SyntheticEvent, confirmAdditional = false) {
    ev.preventDefault();
    if (submitting) return;
    setOwned(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      document.getElementById(`co-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, billing: l.billing, quantity: l.quantity })),
          customer: { name: values.name, email: values.email, phone: values.phone },
          business: business ? { company: values.company, taxId: values.taxId, address: values.address } : undefined,
          paymentMethod: method,
          paymentRef: online ? undefined : values.paymentRef,
          renewKey: renew ? values.renewKey : undefined,
          device: readDevice(),
          confirmAdditional,
          locale,
          website: honeypot,
          elapsed: nowMs() - mountedAt.current,
        }),
      });
      const data = (await res.json()) as { ok: boolean; id?: string; token?: string; payUrl?: string; payError?: string; errors?: Record<string, string>; licensed?: string[] };
      if (data.errors?.form === "already_licensed") {
        setOwned(data.licensed?.length ? data.licensed : [""]);
        setSubmitting(false);
        return;
      }
      if (!data.ok || !data.id || !data.token) {
        const mapped = Object.fromEntries(
          Object.entries(data.errors ?? { form: "generic" }).map(([k, v]) => [k, (t.errors as Record<string, string>)[v] ?? (t.errors as Record<string, string>)[k] ?? t.errors.generic]),
        );
        setErrors(mapped);
        setSubmitting(false);
        return;
      }
      try {
        if (remember) window.localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: values.name, email: values.email, phone: values.phone }));
        else window.localStorage.removeItem(CONTACT_KEY);
      } catch {
        /* storage unavailable */
      }
      cartStore.clear();
      if (data.payUrl) {
        // Hand over to the secure payment page. The button stays busy until the browser leaves.
        setRedirecting(true);
        window.location.assign(data.payUrl);
        return;
      }
      router.push(`${href(locale, `/order/${data.id}`)}?t=${encodeURIComponent(data.token)}${data.payError ? "&pay=retry" : ""}`);
    } catch {
      setErrors({ form: t.errors.generic });
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-10 text-center">
        <p className="text-muted">{t.empty}</p>
        <Button asChild className="mt-6">
          <Link href={href(locale, "/pricing")}>{cart.emptyCta}</Link>
        </Button>
      </div>
    );
  }

  const describedBy = (key: string, hint?: boolean) => (errors[key] ? `co-${key}-error` : hint ? `co-${key}-hint` : undefined);
  const totalLabel = formatEGP(total, locale, true);
  const submitLabel = method === "kiosk" ? t.payKiosk : online ? fill(t.pay, { amount: totalLabel }) : t.submit;
  const busyLabel = redirecting ? t.redirecting : common.loading;

  return (
    <form id="checkout-form" onSubmit={onSubmit} noValidate className="grid gap-8 pb-24 lg:grid-cols-12 lg:pb-0">
      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden className="absolute -start-[9999px] top-auto h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>

      <div className="grid gap-6 lg:col-span-7">
        <fieldset className="rounded-2xl border border-border bg-surface p-6">
          <legend className="float-start mb-5 w-full">
            <StepTitle n={1}>{t.contact}</StepTitle>
          </legend>
          <div className="clear-both grid gap-4 sm:grid-cols-2">
            <Field label={t.name} htmlFor="co-name" error={errors.name} className="sm:col-span-2">
              <Input id="co-name" autoComplete="name" value={values.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={describedBy("name")} />
            </Field>
            <Field label={t.email} htmlFor="co-email" hint={t.emailHint} error={errors.email}>
              <Input id="co-email" type="email" dir="ltr" autoComplete="email" inputMode="email" value={values.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby={describedBy("email", true)} />
            </Field>
            <Field label={t.phone} htmlFor="co-phone" hint={online ? t.phoneHint : t.phoneHintTransfer} error={errors.phone}>
              <Input id="co-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="010 1234 5678" value={values.phone} onChange={set("phone")} aria-invalid={!!errors.phone} aria-describedby={describedBy("phone", true)} />
            </Field>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            {t.remember}
          </label>
        </fieldset>

        <fieldset className="rounded-2xl border border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[linear-gradient(160deg,color-mix(in_oklab,var(--accent)_6%,var(--surface)),var(--surface)_60%)] p-6">
          <legend className="float-start mb-5 w-full">
            <StepTitle n={2}>{t.chooseMethod}</StepTitle>
          </legend>
          <div role="radiogroup" aria-label={t.chooseMethod} className="clear-both grid gap-3 sm:grid-cols-2">
            {available.map((m) => {
              const Icon = METHOD_ICON[m];
              const info = t.method[m];
              const selected = method === m;
              return (
                <label
                  key={m}
                  className={cn(
                    "group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-[border-color,background-color,box-shadow]",
                    "has-[:focus-visible]:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_22%,transparent)]",
                    selected
                      ? "border-[color-mix(in_oklab,var(--accent)_70%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface))]"
                      : "border-border bg-surface hover:border-border-strong hover:bg-surface-2",
                  )}
                >
                  <input type="radio" name="paymentMethod" value={m} checked={selected} onChange={() => setMethod(m)} className="peer sr-only" />
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      selected ? "border-[color-mix(in_oklab,var(--accent)_55%,transparent)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-accent-fg" : "border-border bg-surface-2 text-muted",
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-fg">{info.title}</span>
                      <span className="rounded bg-surface-3 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted">{info.badge}</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">{info.body}</span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                      selected ? "border-accent bg-accent" : "border-border-strong",
                    )}
                  >
                    {selected ? <span className="size-1.5 rounded-full bg-on-accent" /> : null}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-5" aria-live="polite">
            {online ? (
              <div className="rounded-xl border border-border bg-bg-elevated/60 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-fg">
                  <ShieldCheck className="size-4 text-success" aria-hidden /> {t.online.title}
                </p>
                <p className="mt-2 text-fg-soft">{method === "kiosk" ? t.online.kiosk : method === "installments" ? t.online.installments : t.online.body}</p>
                <p className="mt-2 text-xs text-muted">{t.online.after}</p>
                {method === "card" ? (
                  <div className="ltr mt-3 flex items-center gap-3 opacity-90" aria-hidden>
                    <VisaMark className="h-3.5" />
                    <MastercardMark className="h-5" />
                    <span className="text-xs font-semibold text-muted">Meeza</span>
                    <Lock className="ms-auto size-4 text-success" />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-bg-elevated/60 p-4">
                <p className="mb-3 text-sm font-semibold text-fg">{t.instapay.title}</p>
                <ol className="grid gap-4 text-sm">
                  <li className="grid gap-2">
                    <span className="text-fg-soft">
                      1. {t.instapay.step1} <b className="text-fg">{totalLabel}</b> {t.instapay.step2}
                    </span>
                    <CopyInline value={shop.instapayNumber} />
                    {shop.instapayName ? (
                      <span className="text-xs text-muted">
                        {t.instapay.accountName}: <span className="text-fg-soft">{shop.instapayName}</span>
                      </span>
                    ) : null}
                    {shop.instapayLink ? (
                      <div className="mt-1 flex flex-wrap items-center gap-4">
                        <Button asChild variant="secondary" size="sm">
                          <a href={shop.instapayLink} target="_blank" rel="noopener noreferrer">
                            {t.instapay.openApp} <ExternalLink aria-hidden />
                          </a>
                        </Button>
                        {shop.instapayQr ? (
                          <div className="flex items-center gap-3 text-xs text-muted">
                            <div role="img" aria-label={t.instapay.scan} className="size-24 shrink-0 rounded-lg bg-white p-1.5 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: shop.instapayQr }} />
                            <span className="max-w-32">{t.instapay.scan}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                  <li className="text-fg-soft">2. {t.instapay.step3}</li>
                </ol>
                <div className="mt-4">
                  <Field label={t.instapay.reference} htmlFor="co-paymentRef" hint={t.instapay.referenceHint} error={errors.paymentRef}>
                    <Input id="co-paymentRef" dir="ltr" autoComplete="off" value={values.paymentRef} onChange={set("paymentRef")} aria-invalid={!!errors.paymentRef} aria-describedby={describedBy("paymentRef", true)} className="font-mono" />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="grid gap-5 rounded-2xl border border-border bg-surface p-6">
          <legend className="sr-only">{t.business}</legend>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={business} onChange={(e) => setBusiness(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
            <span>
              <span className="flex items-center gap-2 font-semibold">
                <Building2 className="size-4 text-accent-fg" aria-hidden />
                {t.business}
              </span>
              <span className="mt-0.5 block text-sm text-muted">{t.businessHint}</span>
            </span>
          </label>
          {business ? (
            <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
              <Field label={t.company} htmlFor="co-company" error={errors.company}>
                <Input id="co-company" autoComplete="organization" value={values.company} onChange={set("company")} aria-invalid={!!errors.company} aria-describedby={describedBy("company")} />
              </Field>
              <Field label={t.taxId} htmlFor="co-taxId" hint={t.taxIdHint} error={errors.taxId}>
                <Input id="co-taxId" dir="ltr" inputMode="numeric" placeholder="123-456-789" value={values.taxId} onChange={set("taxId")} aria-invalid={!!errors.taxId} aria-describedby={describedBy("taxId", true)} />
              </Field>
              <Field label={t.address} htmlFor="co-address" className="sm:col-span-2">
                <Textarea id="co-address" autoComplete="street-address" rows={2} className="min-h-20" value={values.address} onChange={set("address")} />
              </Field>
            </div>
          ) : null}
          <label className="flex cursor-pointer items-start gap-3 border-t border-border pt-5">
            <input type="checkbox" checked={renew} onChange={(e) => setRenew(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
            <span>
              <span className="flex items-center gap-2 font-semibold">
                <RefreshCw className="size-4 text-accent-fg" aria-hidden />
                {t.renew}
              </span>
              <span className="mt-0.5 block text-sm text-muted">{t.renewHint}</span>
            </span>
          </label>
          {renew ? (
            <Field label={t.renewKey} htmlFor="co-renewKey" error={errors.renewKey}>
              <Input id="co-renewKey" dir="ltr" placeholder="VLX-XXXX-XXXX-XXXX-XXXX" value={values.renewKey} onChange={set("renewKey")} className="font-mono" aria-invalid={!!errors.renewKey} />
            </Field>
          ) : null}
        </fieldset>
      </div>

      <aside className="lg:col-span-5">
        <div className="sticky top-24 overflow-hidden rounded-2xl border border-border bg-surface">
          <h2 className="border-b border-border px-6 py-4 text-base font-semibold">{t.summary}</h2>
          <ul className="divide-y divide-border px-6">
            {lines.map((item) => {
              const product = catalog.get(item.productId)!;
              return (
                <li key={item.id} className="flex items-center gap-3 py-4">
                  <ProductThumb image={product.image} art={product.art} name={product.name} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      <span className="ltr">{product.name}</span>
                      {item.quantity > 1 ? <span className="text-muted"> × {item.quantity}</span> : null}
                    </p>
                    <p className="text-xs text-muted">{item.billing === "monthly" ? common.monthly : common.yearly}</p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">{formatEGP((priceOf(product, item.billing) ?? 0) * item.quantity, locale)}</p>
                </li>
              );
            })}
          </ul>
          <dl className="grid gap-2 border-t border-border bg-bg-elevated/50 px-6 py-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t.subtotal}</dt>
              <dd className="tabular-nums">{formatEGP(subtotal, locale, true)}</dd>
            </div>
            {shop.vatRate > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted">{fill(t.vat, { rate: shop.vatRate })}</dt>
                <dd className="tabular-nums">{formatEGP(vat, locale, true)}</dd>
              </div>
            ) : null}
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold">{t.total}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{totalLabel}</dd>
            </div>
          </dl>
          <div className="px-6 pb-6">
            {errors.form ? (
              <p role="alert" className="mb-3 rounded-lg border border-[color-mix(in_oklab,var(--danger)_40%,var(--border))] bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-danger">
                {errors.form}
              </p>
            ) : null}
            {owned ? (
              <div role="alert" className="mb-4 rounded-xl border border-[color-mix(in_oklab,var(--warning)_45%,var(--border))] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-4 text-sm">
                <p className="font-semibold">{t.owned.title}</p>
                <p className="mt-1 text-fg-soft">{fill(t.owned.body, { products: owned.filter(Boolean).join(", ") || "VEYLIX" })}</p>
                <div className="mt-3 grid gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setOwned(null);
                      setRenew(true);
                      window.setTimeout(() => document.getElementById("co-renewKey")?.focus(), 50);
                    }}
                  >
                    <RefreshCw aria-hidden /> {t.owned.renew}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={(ev) => onSubmit(ev, true)}>
                    {t.owned.anotherPc}
                  </Button>
                </div>
              </div>
            ) : null}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
              {submitting ? busyLabel : submitLabel}
            </Button>
            <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted">
              <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
              {online ? t.secureOnline : t.secure}
            </p>
            <p className="mt-2 text-xs text-muted">
              <Link href={href(locale, "/legal/terms")} className="underline-offset-2 hover:underline">
                {t.terms}
              </Link>
            </p>
          </div>
        </div>
      </aside>

      {/* Phones: the pay button stays in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-strong bg-bg-elevated/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-muted">{t.total}</p>
            <p className="text-lg font-semibold tabular-nums leading-tight">{totalLabel}</p>
          </div>
          <Button type="submit" className="ms-auto flex-1" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
            {submitting ? busyLabel : method === "kiosk" ? t.payKiosk : online ? t.payShort : t.submit}
          </Button>
        </div>
      </div>
    </form>
  );
}
