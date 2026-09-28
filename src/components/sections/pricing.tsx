"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ArrowRight, Check, Clock, Receipt, Sparkles, Users } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import type { Billing } from "@/lib/catalog-types";
import { EGP_PER_EUR } from "@/lib/constants";
import { currencyLabel, formatAmount } from "@/lib/format";
import { href } from "@/lib/links";
import { priceOf } from "@/lib/pricing";
import { cn, fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section";
import { useUI } from "@/components/providers/site-providers";
import { ProductThumb } from "@/components/brand/product-thumb";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

const OTHER_METHODS = ["card", "fawry", "wallet", "meeza"] as const;

type Props = {
  locale: Locale;
  t: Dictionary["pricing"];
  common: Dictionary["common"];
  methods: Dictionary["checkout"]["methods"];
  headingLevel?: "h1" | "h2";
};

const noop = () => () => {};
function useOutsideEgypt() {
  return React.useSyncExternalStore(
    noop,
    () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone !== "Africa/Cairo";
      } catch {
        return false;
      }
    },
    () => false,
  );
}

function BillingToggle({ billing, setBilling, t, common }: { billing: Billing; setBilling: (b: Billing) => void; t: Props["t"]; common: Props["common"] }) {
  return (
    <div role="radiogroup" aria-label={t.toggleLabel} className="relative grid grid-cols-2 rounded-full border border-border-strong bg-surface p-1 text-sm">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-surface-3 shadow-[inset_0_0_0_1px_var(--border-strong),0_4px_20px_-6px_var(--glow)] transition-[inset-inline-start] duration-300 ease-out",
          billing === "monthly" ? "start-1" : "start-[calc(50%+0px)]",
        )}
      />
      {(["monthly", "yearly"] as const).map((b) => (
        <button
          key={b}
          type="button"
          role="radio"
          aria-checked={billing === b}
          onClick={() => setBilling(b)}
          className={cn("relative z-10 inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 font-medium transition-colors", billing === b ? "text-fg" : "text-muted hover:text-fg")}
        >
          {b === "monthly" ? common.monthly : common.yearly}
          {b === "yearly" ? <span className="rounded-full bg-[color-mix(in_oklab,var(--success)_16%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-success">{t.save}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Price({ amount, locale, period }: { amount: number; locale: Locale; period: string }) {
  return (
    <div className="flex items-baseline gap-1.5" dir={locale === "ar" ? "rtl" : "ltr"}>
      <span className="text-sm font-medium text-muted">{currencyLabel[locale]}</span>
      <span className="relative inline-flex overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={amount}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
            className="ltr text-[40px] font-semibold leading-none tracking-[-0.04em] text-fg tabular-nums"
          >
            {formatAmount(amount)}
          </m.span>
        </AnimatePresence>
      </span>
      <span className="text-sm text-muted">{period}</span>
    </div>
  );
}

export function PricingSection({ locale, t, common, methods, headingLevel = "h2" }: Props) {
  const { products, shop } = useUI();
  const hasYearly = products.some((p) => p.priceYearly != null);
  const [billing, setBilling] = React.useState<Billing>("monthly");
  const outside = useOutsideEgypt();
  const PlanHeading = headingLevel === "h1" ? "h2" : "h3";
  const tagline = (p: (typeof products)[number]) => (locale === "ar" ? p.taglineAr || p.taglineEn : p.taglineEn || p.taglineAr);

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="relative cv-auto py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-24 -z-10 mx-auto h-[500px] max-w-5xl bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent)]" />
      <div className="container-page">
        {headingLevel === "h1" ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <span className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-accent-fg">{t.eyebrow}</span>
            <h1 id="pricing-title" className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              {t.title}
            </h1>
            <p className="text-pretty text-lg text-muted">{t.sub}</p>
          </div>
        ) : (
          <SectionHeader id="pricing-title" eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
        )}

        {products.length === 0 ? (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-dashed border-border-strong p-8 text-center">
            <Clock className="mx-auto size-6 text-accent-fg" aria-hidden />
            <p className="mt-3 font-semibold">{t.emptyTitle}</p>
            <p className="mt-1 text-sm text-muted">{t.emptyBody}</p>
          </div>
        ) : (
          <>
            {hasYearly ? (
              <div className="mt-10 flex justify-center">
                <BillingToggle billing={billing} setBilling={setBilling} t={t} common={common} />
              </div>
            ) : null}

            <div className={cn("mx-auto mt-12 grid gap-4 md:grid-cols-2", products.length >= 3 ? "xl:grid-cols-3" : "max-w-4xl")}>
              {products.map((p) => {
                const price = priceOf(p, billing) ?? (billing === "yearly" ? null : priceOf(p, "yearly"));
                const effectiveBilling: Billing = priceOf(p, billing) != null ? billing : billing === "yearly" ? "monthly" : "yearly";
                const featured = false;
                return (
                  <article
                    key={p.id}
                    aria-labelledby={`plan-${p.id}`}
                    className={cn(
                      "relative flex flex-col rounded-2xl border p-6 transition-colors",
                      featured
                        ? "gradient-border border-transparent bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_8%,var(--surface)),var(--surface)_45%)] shadow-[0_30px_80px_-30px_var(--glow)]"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ProductThumb image={p.image} art={p.art} name={p.name} className="size-12" />
                      <div className="min-w-0">
                        <PlanHeading id={`plan-${p.id}`} className="ltr truncate text-lg font-semibold text-fg">
                          <Link href={href(locale, `/products/${p.slug}`)} className="hover:underline">
                            {p.name}
                          </Link>
                        </PlanHeading>
                        {p.hasFile ? null : (
                          <Badge size="sm" className="mt-1">
                            {common.comingSoon}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {tagline(p) ? <p className="mt-3 min-h-[2.75rem] text-sm leading-relaxed text-muted">{tagline(p)}</p> : null}

                    <div className="mt-6 min-h-[76px]">
                      {price != null ? (
                        <>
                          <Price amount={price} locale={locale} period={effectiveBilling === "monthly" ? common.perMonth : common.perYear} />
                          {outside ? <p className="mt-2 font-mono text-[11px] text-muted">{fill(common.approx, { amount: `€${formatAmount(price / EGP_PER_EUR)}` })}</p> : null}
                        </>
                      ) : (
                        <p className="text-2xl font-semibold text-fg">{t.noPrice}</p>
                      )}
                    </div>

                    <div className="mt-auto grid gap-2 pt-6">
                      {price != null ? (
                        <AddToCartButton productId={p.id} billing={effectiveBilling} label={t.addToCart} addedLabel={t.added} variant="primary" size="md" />
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        {shop.trialsEnabled ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`${href(locale, "/trial")}?product=${p.slug}`}>{t.startTrial}</Link>
                          </Button>
                        ) : null}
                        <Button asChild variant="ghost" size="sm" className={shop.trialsEnabled ? "" : "col-span-2"}>
                          <Link href={`${href(locale, "/download")}?product=${p.slug}`}>{t.download}</Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        <div className="mx-auto mt-4 flex max-w-5xl flex-col gap-4 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--violet)_40%,var(--border))] bg-[color-mix(in_oklab,var(--violet)_10%,var(--surface))] text-violet-fg">
              <Users className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-fg">{t.teams.title}</p>
              <p className="mt-1 max-w-xl text-sm text-muted">{t.teams.body}</p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link href={href(locale, "/enterprise#contact")}>
              {t.teams.cta}
              <ArrowRight className="rtl:-scale-x-100" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <ul className="grid gap-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Receipt className="size-4 shrink-0 text-accent-fg" aria-hidden />
              {shop.vatRate > 0 ? fill(t.vatNote, { vat: shop.vatRate }) : t.vatNone}
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" aria-hidden />
              {t.keysNote}
            </li>
            {shop.trialsEnabled ? (
              <li className="flex items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-violet-fg" aria-hidden />
                {fill(t.trialNote, { days: shop.trialDays })}
              </li>
            ) : null}
          </ul>
          <div>
            <p className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted lg:text-end">{t.payWith}</p>
            <ul className="flex flex-wrap gap-2 lg:justify-end">
              <li className="ltr rounded-lg border border-[color-mix(in_oklab,var(--accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] px-3 py-1.5 text-xs font-semibold text-accent-fg">
                InstaPay
              </li>
              {OTHER_METHODS.map((mth) => (
                <li key={mth} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
                  {methods[mth]}
                  <span className="rounded bg-surface-3 px-1 py-px text-[9px] font-medium uppercase tracking-wide">{t.comingSoon}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
