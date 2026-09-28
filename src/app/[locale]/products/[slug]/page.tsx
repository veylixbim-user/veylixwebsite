import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, Terminal as TerminalIcon } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { plans, productSlugs, products, revitVersions, type ProductSlug } from "@/lib/catalog";
import { formatEGP } from "@/lib/format";
import { href } from "@/lib/links";
import { pageMetadata } from "@/lib/metadata";
import { productSchema } from "@/lib/schema";
import { fill } from "@/lib/utils";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section";
import { ProductIcon } from "@/components/brand/product-icon";
import { ProductArt } from "@/components/mockups/product-art";
import { BeforeAfter } from "@/components/mockups/before-after";
import { PanelSchedule } from "@/components/mockups/panel-schedule";
import { Terminal } from "@/components/mockups/terminal";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Reveal } from "@/components/motion/reveal";
import { SpotlightGroup } from "@/components/motion/spotlight";
import { FinalCta } from "@/components/sections/final-cta";

export const dynamicParams = false;

export function generateStaticParams() {
  return productSlugs.map((slug) => ({ slug }));
}

function isSlug(s: string): s is ProductSlug {
  return (productSlugs as readonly string[]).includes(s);
}

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isSlug(slug)) return {};
  const dict = await getDictionary(locale);
  return pageMetadata(locale, `/products/${slug}`, products[slug].name, dict.products.items[slug].description);
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isSlug(slug)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.productPage;
  const p = products[slug];
  const c = dict.products.items[slug];
  const isBundle = slug === "bundle";
  const fromPrice = isBundle ? plans.pro.price!.monthly : plans.starter.price!.monthly;
  const related = productSlugs.filter((s) => s !== slug && s !== "bundle").slice(0, 3);
  const sc = dict.showcase;

  const visual =
    slug === "circuit" ? (
      <BeforeAfter before={sc.beforeAfter.before} after={sc.beforeAfter.after} label={sc.beforeAfter.sliderLabel} />
    ) : slug === "panel" ? (
      <PanelSchedule panelName={sc.panel.panelName} specs={sc.panel.specs} columns={sc.panel.columns} rows={sc.panel.rows} total={sc.panel.total} synced={sc.panel.synced} />
    ) : (
      <Terminal
        title={`${p.name} — Revit 2025`}
        lines={[
          ...c.commands.flatMap((cmd) => [
            { kind: "cmd", text: cmd.cmd },
            { kind: "ok", text: cmd.desc },
          ]),
          { kind: "done", text: `${p.name} v${p.version}` },
        ]}
      />
    );

  return (
    <>
      <JsonLd data={productSchema(slug, locale, dict)} />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_70%_70%_at_30%_0%,#000_30%,transparent_100%)]" />
          <div className="absolute -top-40 start-0 h-[480px] w-[800px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]" />
        </div>
        <div className="container-page">
          <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-1.5 text-sm text-muted">
            <Link href={href(locale, "/#products")} className="hover:text-fg">
              {t.breadcrumb}
            </Link>
            <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
            <span aria-current="page" className="ltr text-fg">
              {p.name}
            </span>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-6">
              <div className="flex items-center gap-4">
                <ProductIcon slug={slug} accent={p.accent} size="lg" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="font-mono uppercase tracking-wider">
                    {c.category}
                  </Badge>
                  <Badge variant="accent" className="ltr font-mono">
                    v{p.version}
                  </Badge>
                </div>
              </div>
              <h1 className="ltr mt-6 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">{p.name}</h1>
              <p className="mt-4 text-xl leading-snug text-fg-soft">{c.tagline}</p>
              <p className="mt-4 max-w-xl leading-relaxed text-muted">{c.description}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {isBundle ? (
                  <AddToCartButton plan="pro" label={t.buyBundle} addedLabel={dict.pricing.added} />
                ) : (
                  <AddToCartButton plan="starter" plugin={slug as Exclude<ProductSlug, "bundle">} label={fill(t.buyStarter, { name: p.name.replace("VEYLIX ", "") })} addedLabel={dict.pricing.added} />
                )}
                <Button asChild variant="ghost" size="lg">
                  <Link href={href(locale, "/trial")}>
                    {dict.pricing.startTrial}
                    <ArrowRight className="rtl:-scale-x-100" aria-hidden />
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted">
                {fill(t.fromPrice, { price: `${formatEGP(fromPrice, locale)}${dict.common.perMonth}` })} · {dict.common.exclVat}
                {!isBundle ? (
                  <>
                    {" · "}
                    <Link href={href(locale, "/products/bundle")} className="text-accent-fg hover:underline">
                      {t.orBundle}
                    </Link>
                  </>
                ) : null}
              </p>

              <dl className="mt-10 grid max-w-md grid-cols-2 gap-4 border-t border-border pt-6">
                <div>
                  <dt className="text-xs text-muted">{c.metric.label}</dt>
                  <dd className="ltr mt-1 font-mono text-3xl font-semibold text-fg">{c.metric.value}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t.compatibility}</dt>
                  <dd className="ltr mt-1 font-mono text-lg font-semibold text-fg">
                    Revit {revitVersions[0]}–{revitVersions[revitVersions.length - 1]}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="min-w-0 lg:col-span-6">
              <div className="relative">
                <div aria-hidden className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(60%_60%_at_50%_40%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent)]" />
                {visual}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section aria-labelledby="features-title" className="py-16 sm:py-20">
        <div className="container-page">
          <SectionHeader id="features-title" eyebrow={t.features} title={c.tagline} />
          <SpotlightGroup className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.06} className="h-full">
                <div className="spotlight h-full rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong">
                  <span className="font-mono text-xs text-accent-fg">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </SpotlightGroup>
        </div>
      </section>

      {/* Commands + spec */}
      <section className="py-16 sm:py-20">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          <Reveal className="h-full min-w-0">
            <div className="h-full rounded-2xl border border-border bg-surface p-7">
              <div className="flex items-center gap-2">
                <TerminalIcon className="size-5 text-accent-fg" aria-hidden />
                <h2 className="text-xl font-semibold">{t.commands}</h2>
              </div>
              <p className="mt-1 text-sm text-muted">{t.commandsSub}</p>
              <ul className="mt-6 grid gap-3">
                {c.commands.map((cmd) => (
                  <li key={cmd.cmd} className="min-w-0 rounded-xl border border-border bg-bg-elevated p-4">
                    <code dir="ltr" className="block overflow-x-auto whitespace-nowrap text-[12.5px] text-fg">
                      <span className="text-accent-fg">› </span>
                      {cmd.cmd}
                    </code>
                    <p className="mt-2 text-sm text-muted">{cmd.desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="h-full min-w-0">
            <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-7">
              <h2 className="text-xl font-semibold">{t.spec}</h2>
              <dl className="mt-6 grid gap-5">
                <div className="grid gap-1 border-b border-border pb-5 sm:grid-cols-[140px_1fr]">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{sc.specs.input}</dt>
                  <dd className="text-sm text-fg-soft">{c.spec.input}</dd>
                </div>
                <div className="grid gap-1 border-b border-border pb-5 sm:grid-cols-[140px_1fr]">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-fg">{sc.specs.output}</dt>
                  <dd className="text-sm text-fg">{c.spec.output}</dd>
                </div>
                <div className="grid gap-1 border-b border-border pb-5 sm:grid-cols-[140px_1fr]">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{sc.specs.standards}</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {p.standards.map((s) => (
                      <span key={s} className="ltr rounded-md border border-border-strong bg-surface-2 px-2 py-0.5 font-mono text-[11px]">
                        {s}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="grid gap-1 border-b border-border pb-5 sm:grid-cols-[140px_1fr]">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{t.compatibility}</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {revitVersions.map((v) => (
                      <Badge key={v} variant="mono" size="sm">
                        Revit {v}
                      </Badge>
                    ))}
                  </dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{t.included}</dt>
                  <dd className="ltr text-sm font-medium text-fg">{isBundle ? t.planNamesBundle : t.planNames}</dd>
                </div>
              </dl>
              <div className="mt-auto pt-8">
                <Button asChild variant="secondary" className="w-full">
                  <Link href={href(locale, "/pricing")}>
                    {dict.nav.productsMenuAll}
                    <ArrowRight className="rtl:-scale-x-100" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Related */}
      <section aria-labelledby="related-title" className="py-16 sm:py-20">
        <div className="container-page">
          <h2 id="related-title" className="text-2xl font-semibold tracking-tight">
            {t.related}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {related.map((s) => (
              <Link
                key={s}
                href={href(locale, `/products/${s}`)}
                className="group overflow-hidden rounded-2xl border border-border bg-surface p-1.5 transition-colors hover:border-border-strong"
              >
                <div className="bg-blueprint h-28 rounded-xl border border-border bg-bg-elevated p-3">
                  <ProductArt slug={s} />
                </div>
                <div className="flex items-start gap-3 p-4">
                  <ProductIcon slug={s} accent={products[s].accent} size="sm" />
                  <div>
                    <p className="ltr font-semibold">{products[s].name}</p>
                    <p className="mt-1 text-sm text-muted">{dict.products.items[s].tagline}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCta locale={locale} dict={dict} />
    </>
  );
}
