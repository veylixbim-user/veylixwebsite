import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Fingerprint, KeyRound, Network, PackageCheck, Receipt, ShieldCheck, UserCog, Users, Workflow } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { href } from "@/lib/links";
import { pageMetadata } from "@/lib/metadata";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { SpotlightGroup } from "@/components/motion/spotlight";
import { ContactForm } from "@/components/forms/contact-form";

const ICONS = [Users, Fingerprint, Network, PackageCheck, UserCog, Workflow];

export async function generateMetadata({ params }: PageProps<"/[locale]/enterprise">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return pageMetadata(locale, "/enterprise", dict.enterprise.eyebrow, dict.enterprise.sub);
}

export default async function EnterprisePage({ params }: PageProps<"/[locale]/enterprise">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.enterprise;

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} sub={t.sub}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <a href="#contact">
              {t.ctaPrimary}
              <ArrowRight className="rtl:-scale-x-100" aria-hidden />
            </a>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href={href(locale, "/pricing")}>{t.ctaSecondary}</Link>
          </Button>
        </div>
      </PageHero>

      <section className="py-12 sm:py-16">
        <SpotlightGroup className="container-page grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.map((f, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={f.title} delay={(i % 3) * 0.06} className="h-full">
                <div className="spotlight h-full rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-accent-fg">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h2 className="mt-5 text-lg font-semibold">{f.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </SpotlightGroup>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-4 lg:grid-cols-2">
          <Reveal className="h-full">
            <div className="h-full rounded-2xl border border-border bg-surface p-7 sm:p-8">
              <ShieldCheck className="size-7 text-success" aria-hidden />
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">{t.security.title}</h2>
              <p className="mt-2 text-muted">{t.security.body}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {t.security.items.map((i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-xl border border-border bg-bg-elevated p-3.5 text-sm text-fg-soft">
                    <KeyRound className="mt-0.5 size-4 shrink-0 text-accent-fg" aria-hidden />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="h-full">
            <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-[linear-gradient(150deg,color-mix(in_oklab,var(--violet)_12%,var(--surface)),var(--surface)_55%)] p-7 sm:p-8">
              <Receipt className="size-7 text-violet-fg" aria-hidden />
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">{t.billing.title}</h2>
              <p className="mt-2 text-muted">{t.billing.body}</p>
              <p className="mt-8 inline-flex rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm font-semibold text-fg">{t.billing.locked}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24 py-12 sm:py-16">
        <div className="container-page">
          <div className="grid gap-10 rounded-3xl border border-border bg-surface p-7 sm:p-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 id="contact-title" className="text-3xl font-semibold tracking-tight">
                {t.form.title}
              </h2>
              <p className="mt-3 text-muted">{t.form.sub}</p>
            </div>
            <div className="lg:col-span-8">
              <ContactForm t={t.form} errorsT={dict.checkout.errors} locale={locale} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
