"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ArrowRight, Check, GraduationCap, Lock, Receipt, ShieldCheck, Sparkles } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { EGP_PER_EUR, pluginSlugs, plans, products, type BillingCycle, type PluginSlug, type PurchasablePlanId } from "@/lib/catalog";
import { cartStore } from "@/lib/cart-store";
import { currencyLabel, formatAmount } from "@/lib/format";
import { href } from "@/lib/links";
import { cn, fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section";
import { useUI } from "@/components/providers/site-providers";
import { ProductIcon } from "@/components/brand/product-icon";

export const PAYMENT_METHODS = ["Paymob", "Fawry", "Vodafone Cash", "InstaPay", "Visa", "Mastercard", "Meeza"];

type Props = {
  locale: Locale;
  t: Dictionary["pricing"];
  common: Dictionary["common"];
  pluginNames: Record<PluginSlug, string>;
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

function BillingToggle({ billing, setBilling, t, common }: { billing: BillingCycle; setBilling: (b: BillingCycle) => void; t: Props["t"]; common: Props["common"] }) {
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
          className={cn(
            "relative z-10 inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 font-medium transition-colors",
            billing === b ? "text-fg" : "text-muted hover:text-fg",
          )}
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
            initial={{ y: 18, opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -18, opacity: 0, filter: "blur(4px)" }}
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

export function PricingSection({ locale, t, common, pluginNames, headingLevel = "h2" }: Props) {
  const { setCartOpen } = useUI();
  const [billing, setBilling] = React.useState<BillingCycle>("yearly");
  const [plugin, setPlugin] = React.useState<PluginSlug>("circuit");
  const [added, setAdded] = React.useState<string | null>(null);
  const outside = useOutsideEgypt();

  function add(plan: PurchasablePlanId) {
    cartStore.add({ plan, billing, plugin: plan === "starter" ? plugin : undefined });
    setAdded(plan);
    window.setTimeout(() => setAdded((a) => (a === plan ? null : a)), 1800);
    setCartOpen(true);
  }

  const period = billing === "monthly" ? common.perMonth : common.perYear;
  const PlanHeading = headingLevel === "h1" ? "h2" : "h3";
  const tiers = ["starter", "pro", "studio", "enterprise"] as const;

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

        <div className="mt-10 flex justify-center">
          <BillingToggle billing={billing} setBilling={setBilling} t={t} common={common} />
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tiers.map((id) => {
            const plan = plans[id];
            const copy = t.plans[id];
            const featured = !!plan.highlighted;
            const price = plan.price?.[billing];
            return (
              <article
                key={id}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 transition-colors",
                  featured
                    ? "gradient-border border-transparent bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_8%,var(--surface)),var(--surface)_45%)] shadow-[0_30px_80px_-30px_var(--glow)]"
                    : "border-border bg-surface hover:border-border-strong",
                )}
                aria-labelledby={`plan-${id}`}
              >
                <div className="flex items-center justify-between">
                  <PlanHeading id={`plan-${id}`} className="ltr text-lg font-semibold text-fg">
                    {copy.name}
                  </PlanHeading>
                  {featured ? (
                    <Badge variant="accent" size="sm">
                      <Sparkles className="size-3" aria-hidden />
                      {t.mostPopular}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-muted">{copy.description}</p>

                <div className="mt-6 min-h-[92px]">
                  {price !== undefined ? (
                    <>
                      <Price amount={price} locale={locale} period={period} />
                      <p className="mt-2 text-xs text-muted">
                        {billing === "yearly" ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <Lock className="size-3" aria-hidden />
                            {t.lockedRate}
                          </span>
                        ) : (
                          t.billedMonthly
                        )}
                      </p>
                      {outside ? (
                        <p className="mt-1 font-mono text-[11px] text-muted">
                          {fill(common.approx, { amount: `€${formatAmount(price / EGP_PER_EUR)}` })}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="text-[40px] font-semibold leading-none tracking-[-0.04em] text-fg">{t.custom}</p>
                      <p className="mt-2 text-xs text-muted">{t.customNote}</p>
                    </>
                  )}
                </div>

                <div className="mt-4 min-h-[66px]">
                  {id === "starter" ? (
                    <>
                      <label htmlFor="starter-plugin" className="mb-1.5 block text-xs font-medium text-muted">
                        {t.choosePlugin}
                      </label>
                      <Select id="starter-plugin" value={plugin} onChange={(e) => setPlugin(e.target.value as PluginSlug)} className="h-10">
                        {pluginSlugs.map((s) => (
                          <option key={s} value={s}>
                            {pluginNames[s]}
                          </option>
                        ))}
                      </Select>
                    </>
                  ) : (
                    <>
                      <p className="mb-1.5 text-xs font-medium text-muted">{t.includes}</p>
                      <ul className="flex gap-1.5">
                        {pluginSlugs.map((s) => (
                          <li key={s} title={pluginNames[s]}>
                            <ProductIcon slug={s} accent={products[s].accent} size="sm" className="size-10 rounded-lg" />
                            <span className="sr-only">{pluginNames[s]}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <div className="mt-5 grid gap-2">
                  {id === "enterprise" ? (
                    <Button asChild variant="secondary">
                      <Link href={href(locale, "/enterprise#contact")}>
                        {t.contactSales}
                        <ArrowRight className="rtl:-scale-x-100" aria-hidden />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant={featured ? "primary" : "secondary"} onClick={() => add(id)} aria-live="polite">
                      {added === id ? (
                        <>
                          <Check aria-hidden /> {t.added}
                        </>
                      ) : (
                        t.addToCart
                      )}
                    </Button>
                  )}
                  {id !== "enterprise" ? (
                    <Link href={href(locale, "/trial")} className="py-1 text-center text-xs font-medium text-muted hover:text-fg">
                      {t.startTrial}
                    </Link>
                  ) : null}
                </div>

                <ul className="mt-6 grid gap-2.5 border-t border-border pt-6">
                  {copy.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm text-fg-soft">
                      <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-accent-fg" : "text-success")} aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* Student */}
        <div id="student" className="mt-4 flex scroll-mt-28 flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--violet)_40%,var(--border))] bg-[color-mix(in_oklab,var(--violet)_10%,var(--surface))] text-violet-fg">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <PlanHeading className="font-semibold text-fg">{t.student.title}</PlanHeading>
                <Badge variant="violet" size="sm">
                  {t.student.badge}
                </Badge>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted">{t.student.body}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <p className="text-end">
              <span className="text-xs text-muted">{currencyLabel[locale]} </span>
              <span className="ltr text-2xl font-semibold tabular-nums">{formatAmount(plans.student.price![billing])}</span>
              <span className="text-xs text-muted">{period}</span>
            </p>
            <Button variant="secondary" onClick={() => add("student")}>
              {added === "student" ? <Check aria-hidden /> : null}
              {added === "student" ? t.added : t.student.cta}
            </Button>
          </div>
        </div>

        {/* Notes + payments */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <ul className="grid gap-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Receipt className="size-4 shrink-0 text-accent-fg" aria-hidden />
              {t.vatNote}
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" aria-hidden />
              {t.trialNote}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-violet-fg" aria-hidden />
              {t.invoiceNote}
            </li>
          </ul>
          <div>
            <p className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted lg:text-end">{t.payWith}</p>
            <ul className="flex flex-wrap gap-2 lg:justify-end" aria-label={t.payWith}>
              {PAYMENT_METHODS.map((p) => (
                <li key={p} className="ltr rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg-soft">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
