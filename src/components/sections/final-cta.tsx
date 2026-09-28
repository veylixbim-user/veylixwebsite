import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { href } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export function FinalCta({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.finalCta;
  return (
    <section aria-labelledby="cta-title" className="relative cv-auto py-16 sm:py-20">
      <div className="container-page">
        <div className="noise relative isolate overflow-hidden rounded-3xl border border-border-strong bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_16%,var(--surface)),var(--surface)_45%,color-mix(in_oklab,var(--violet)_18%,var(--surface)))] px-6 py-20 text-center sm:px-12 sm:py-24">
          <div aria-hidden className="bg-blueprint absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,#000,transparent)]" />
          <div aria-hidden className="absolute -top-24 left-1/2 -z-10 h-64 w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_30%,transparent),transparent)]" />
          <LogoMark className="mx-auto size-16" />
          <h2 id="cta-title" className="mx-auto mt-8 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.035em] text-fg sm:text-5xl lg:text-6xl">
            {t.title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted">{t.sub}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={href(locale, "/trial")}>
                {t.primary}
                <ArrowRight className="rtl:-scale-x-100" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="w-full bg-bg/30 sm:w-auto">
              <Link href={href(locale, "/enterprise#contact")}>
                <CalendarClock aria-hidden />
                {t.secondary}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
