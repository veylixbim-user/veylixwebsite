"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CreditCard, Landmark, Loader2, Lock, ShieldCheck, Store, Wallet } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { products, type PurchasablePlanId } from "@/lib/catalog";
import { cartStore } from "@/lib/cart-store";
import { formatEGP } from "@/lib/format";
import { href } from "@/lib/links";
import { ORDER_STORAGE_KEY, type Order } from "@/lib/order";
import { lineTotal, totals } from "@/lib/pricing";
import { cn, fill } from "@/lib/utils";
import { EG_MOBILE_RE, EMAIL_RE, isStudentEmail, normalizePhone, normalizeTaxId, TAX_ID_RE } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ProductIcon } from "@/components/brand/product-icon";
import { useCart } from "@/components/providers/site-providers";

type Method = Order["method"];
const METHOD_ICONS: Record<Method, React.ComponentType<{ className?: string }>> = {
  card: CreditCard,
  fawry: Store,
  wallet: Wallet,
  instapay: Landmark,
};

type Props = {
  locale: Locale;
  t: Dictionary["checkout"];
  cart: Dictionary["cart"];
  common: Dictionary["common"];
  planNames: Record<PurchasablePlanId, string>;
  demo: boolean;
};

export function CheckoutForm({ locale, t, cart, common, planNames, demo }: Props) {
  const router = useRouter();
  const items = useCart();
  const { subtotal, vat, total } = totals(items);
  const hasStudent = items.some((i) => i.plan === "student");

  const [values, setValues] = React.useState({ name: "", email: "", phone: "", company: "", taxId: "", address: "", studentEmail: "" });
  const [business, setBusiness] = React.useState(false);
  const [method, setMethod] = React.useState<Method>("card");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

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
    if (business) {
      if (values.company.trim().length < 2) e.company = t.errors.company;
      if (!TAX_ID_RE.test(normalizeTaxId(values.taxId))) e.taxId = t.errors.taxId;
    }
    if (hasStudent && !isStudentEmail(values.studentEmail)) e.studentEmail = t.errors.studentEmail;
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
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
          items,
          method,
          locale,
          customer: { name: values.name, email: values.email, phone: values.phone },
          business: business ? { company: values.company, taxId: values.taxId, address: values.address } : undefined,
          studentEmail: hasStudent ? values.studentEmail : undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean; order?: Order; redirect?: string; errors?: Record<string, string> };
      if (!data.ok) {
        const mapped = Object.fromEntries(
          Object.entries(data.errors ?? { form: "generic" }).map(([k, v]) => [k, (t.errors as Record<string, string>)[v] ?? t.errors.generic]),
        );
        setErrors(mapped);
        return;
      }
      if (data.redirect) {
        window.location.assign(data.redirect);
        return;
      }
      if (data.order) {
        try {
          sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(data.order));
        } catch {
          /* success page falls back to the "check your email" state */
        }
        cartStore.clear();
        router.push(`${href(locale, "/checkout/success")}?order=${encodeURIComponent(data.order.id)}`);
      }
    } catch {
      setErrors({ form: t.errors.generic });
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
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

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-12">
      <div className="grid gap-6 lg:col-span-7">
        {demo ? (
          <p role="note" className="rounded-xl border border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] px-4 py-3 text-sm text-warning">
            {t.demo}
          </p>
        ) : null}

        <fieldset className="rounded-2xl border border-border bg-surface p-6">
          <legend className="float-start mb-5 w-full text-base font-semibold">{t.contact}</legend>
          <div className="clear-both grid gap-4 sm:grid-cols-2">
            <Field label={t.name} htmlFor="co-name" error={errors.name} className="sm:col-span-2">
              <Input id="co-name" autoComplete="name" value={values.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={describedBy("name")} />
            </Field>
            <Field label={t.email} htmlFor="co-email" error={errors.email}>
              <Input id="co-email" type="email" dir="ltr" autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby={describedBy("email")} />
            </Field>
            <Field label={t.phone} htmlFor="co-phone" hint={t.phoneHint} error={errors.phone}>
              <Input id="co-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="010 1234 5678" value={values.phone} onChange={set("phone")} aria-invalid={!!errors.phone} aria-describedby={describedBy("phone", true)} />
            </Field>
            {hasStudent ? (
              <Field label={t.studentEmail} htmlFor="co-studentEmail" hint={t.studentHint} error={errors.studentEmail} className="sm:col-span-2">
                <Input id="co-studentEmail" type="email" dir="ltr" placeholder="name@eng.cu.edu.eg" value={values.studentEmail} onChange={set("studentEmail")} aria-invalid={!!errors.studentEmail} aria-describedby={describedBy("studentEmail", true)} />
              </Field>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-border bg-surface p-6">
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
            <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
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
        </fieldset>

        <fieldset className="rounded-2xl border border-border bg-surface p-6">
          <legend className="float-start mb-5 w-full text-base font-semibold">{t.payment}</legend>
          <div role="radiogroup" aria-label={t.payment} className="clear-both grid gap-3 sm:grid-cols-2">
            {(Object.keys(t.methods) as Method[]).map((m) => {
              const Icon = METHOD_ICONS[m];
              const selected = method === m;
              return (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-[border-color,background-color,box-shadow]",
                    selected
                      ? "border-[color-mix(in_oklab,var(--accent)_60%,transparent)] bg-[color-mix(in_oklab,var(--accent)_6%,var(--surface))] shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_12%,transparent)]"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <input type="radio" name="method" value={m} checked={selected} onChange={() => setMethod(m)} className="sr-only" />
                  <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg border", selected ? "border-accent/50 text-accent-fg" : "border-border text-muted")}>
                    <Icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{t.methods[m].name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{t.methods[m].note}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Summary */}
      <aside className="lg:col-span-5">
        <div className="sticky top-24 overflow-hidden rounded-2xl border border-border bg-surface">
          <h2 className="border-b border-border px-6 py-4 text-base font-semibold">{t.summary}</h2>
          <ul className="divide-y divide-border px-6">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-4">
                <ProductIcon slug={item.plugin ?? "bundle"} accent={item.plugin ? products[item.plugin].accent : "cyan"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    <span className="ltr">VEYLIX {planNames[item.plan]}</span>
                    {item.quantity > 1 ? <span className="text-muted"> × {item.quantity}</span> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {item.plugin ? <span className="ltr">{products[item.plugin].name} · </span> : null}
                    {item.billing === "monthly" ? common.monthly : common.yearly}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums">{formatEGP(lineTotal(item), locale)}</p>
              </li>
            ))}
          </ul>
          <dl className="grid gap-2 border-t border-border bg-bg-elevated/50 px-6 py-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t.subtotal}</dt>
              <dd className="tabular-nums">{formatEGP(subtotal, locale, true)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.vat}</dt>
              <dd className="tabular-nums">{formatEGP(vat, locale, true)}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold">{t.total}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{formatEGP(total, locale, true)}</dd>
            </div>
          </dl>
          <div className="px-6 pb-6">
            {errors.form ? (
              <p role="alert" className="mb-3 text-sm text-danger">
                {errors.form}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
              {submitting ? common.loading : fill(t.pay, { amount: formatEGP(total, locale, true) })}
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
