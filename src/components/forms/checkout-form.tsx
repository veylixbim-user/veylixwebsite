"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Lock, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { cartStore } from "@/lib/cart-store";
import { formatEGP } from "@/lib/format";
import { href } from "@/lib/links";
import { cartTotals, priceOf } from "@/lib/pricing";
import { fill } from "@/lib/utils";
import { EG_MOBILE_RE, EMAIL_RE, normalizePhone, normalizeTaxId, TAX_ID_RE } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ProductThumb } from "@/components/brand/product-thumb";
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

type Props = {
  locale: Locale;
  t: Dictionary["checkout"];
  cart: Dictionary["cart"];
  common: Dictionary["common"];
};

export function CheckoutForm({ locale, t, cart, common }: Props) {
  const router = useRouter();
  const items = useCart();
  const { catalog, shop } = useUI();
  const lines = items.filter((i) => priceOf(catalog.get(i.productId), i.billing) != null);
  const { subtotal, vat, total } = cartTotals(lines, catalog, shop.vatRate);

  const [values, setValues] = React.useState({ name: "", email: "", phone: "", company: "", taxId: "", address: "", paymentRef: "", renewKey: "" });
  const [business, setBusiness] = React.useState(false);
  const [renew, setRenew] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  /** Plugins this email already owns (server asked us to confirm the purchase is for another PC). */
  const [owned, setOwned] = React.useState<string[] | null>(null);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
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
    if (values.paymentRef.trim().length < 4) e.paymentRef = t.errors.paymentRef;
    if (business) {
      if (values.company.trim().length < 2) e.company = t.errors.company;
      if (!TAX_ID_RE.test(normalizeTaxId(values.taxId))) e.taxId = t.errors.taxId;
    }
    if (renew && values.renewKey.trim().length < 10) e.renewKey = t.errors.renewKey;
    return e;
  }

  async function onSubmit(ev: React.SyntheticEvent, confirmAdditional = false) {
    ev.preventDefault();
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
          paymentRef: values.paymentRef,
          renewKey: renew ? values.renewKey : undefined,
          device: readDevice(),
          confirmAdditional,
        }),
      });
      const data = (await res.json()) as { ok: boolean; id?: string; token?: string; errors?: Record<string, string>; licensed?: string[] };
      if (data.errors?.form === "already_licensed") {
        setOwned(data.licensed?.length ? data.licensed : [""]);
        return;
      }
      if (!data.ok || !data.id || !data.token) {
        const mapped = Object.fromEntries(
          Object.entries(data.errors ?? { form: "generic" }).map(([k, v]) => [k, (t.errors as Record<string, string>)[v] ?? (t.errors as Record<string, string>)[k] ?? t.errors.generic]),
        );
        setErrors(mapped);
        return;
      }
      cartStore.clear();
      router.push(`${href(locale, `/order/${data.id}`)}?t=${encodeURIComponent(data.token)}`);
    } catch {
      setErrors({ form: t.errors.generic });
    } finally {
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

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-12">
      <div className="grid gap-6 lg:col-span-7">
        <fieldset className="rounded-2xl border border-border bg-surface p-6">
          <legend className="float-start mb-5 w-full text-base font-semibold">{t.contact}</legend>
          <div className="clear-both grid gap-4 sm:grid-cols-2">
            <Field label={t.name} htmlFor="co-name" error={errors.name} className="sm:col-span-2">
              <Input id="co-name" autoComplete="name" value={values.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={describedBy("name")} />
            </Field>
            <Field label={t.email} htmlFor="co-email" hint={t.emailHint} error={errors.email}>
              <Input id="co-email" type="email" dir="ltr" autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby={describedBy("email", true)} />
            </Field>
            <Field label={t.phone} htmlFor="co-phone" hint={t.phoneHint} error={errors.phone}>
              <Input id="co-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="010 1234 5678" value={values.phone} onChange={set("phone")} aria-invalid={!!errors.phone} aria-describedby={describedBy("phone", true)} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[linear-gradient(160deg,color-mix(in_oklab,var(--accent)_6%,var(--surface)),var(--surface)_60%)] p-6">
          <legend className="float-start mb-5 flex w-full items-center gap-2 text-base font-semibold">
            <Smartphone className="size-4 text-accent-fg" aria-hidden /> {t.instapay.title}
          </legend>
          <ol className="clear-both grid gap-4 text-sm">
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
            </li>
            <li className="text-fg-soft">2. {t.instapay.step3}</li>
          </ol>
          <div className="mt-4">
            <Field label={t.instapay.reference} htmlFor="co-paymentRef" hint={t.instapay.referenceHint} error={errors.paymentRef}>
              <Input id="co-paymentRef" dir="ltr" autoComplete="off" value={values.paymentRef} onChange={set("paymentRef")} aria-invalid={!!errors.paymentRef} aria-describedby={describedBy("paymentRef", true)} className="font-mono" />
            </Field>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs text-muted">{t.otherMethods}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {(["card", "fawry", "wallet", "meeza"] as const).map((m) => (
                <li key={m} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted">
                  {t.methods[m]}
                  <span className="rounded bg-surface-3 px-1 py-px text-[9px] uppercase tracking-wide">{common.comingSoon}</span>
                </li>
              ))}
            </ul>
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
              <p role="alert" className="mb-3 text-sm text-danger">
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
              {submitting ? common.loading : t.submit}
            </Button>
            <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted">
              <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
              {t.secure}
            </p>
            <p className="mt-2 text-xs text-muted">
              <Link href={href(locale, "/legal/terms")} className="underline-offset-2 hover:underline">
                {t.terms}
              </Link>
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
