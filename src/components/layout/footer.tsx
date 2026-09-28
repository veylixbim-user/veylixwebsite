import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { productSlugs, products } from "@/lib/catalog";
import { href } from "@/lib/links";
import { contact, social } from "@/lib/site";
import { fill } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { GitHubIcon, LinkedInIcon, YouTubeIcon } from "@/components/brand/social-icons";
import { NewsletterForm } from "@/components/forms/newsletter-form";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.footer;
  const columns = [
    {
      title: t.columns.products,
      links: productSlugs.map((s) => ({ label: products[s].name, href: href(locale, `/products/${s}`), ltr: true })),
    },
    {
      title: t.columns.company,
      links: [
        { label: t.company.enterprise, href: href(locale, "/enterprise") },
        { label: t.company.contact, href: href(locale, "/enterprise#contact") },
        { label: t.company.students, href: href(locale, "/pricing#student") },
        { label: t.company.support, href: `mailto:${contact.support}` },
      ],
    },
    {
      title: t.columns.resources,
      links: [
        { label: t.resources.docs, href: href(locale, "/docs") },
        { label: t.resources.changelog, href: href(locale, "/changelog") },
        { label: t.resources.trial, href: href(locale, "/trial") },
        { label: t.resources.pricing, href: href(locale, "/pricing") },
      ],
    },
    {
      title: t.columns.legal,
      links: [
        { label: t.legal.terms, href: href(locale, "/legal/terms") },
        { label: t.legal.privacy, href: href(locale, "/legal/privacy") },
        { label: t.legal.refunds, href: href(locale, "/legal/refunds") },
        { label: t.legal.eula, href: href(locale, "/legal/eula") },
      ],
    },
  ];

  const socials = [
    { label: "LinkedIn", href: social.linkedin, Icon: LinkedInIcon },
    { label: "YouTube", href: social.youtube, Icon: YouTubeIcon },
    { label: "GitHub", href: social.github, Icon: GitHubIcon },
  ];

  return (
    <footer className="relative mt-16 border-t border-border bg-bg-elevated/40">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--accent)_50%,transparent)] to-transparent" />
      <div className="container-page grid gap-12 py-16 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            <span className="text-fg-soft">{dict.common.tagline}</span> {t.blurb}
          </p>
          <div className="max-w-sm">
            <p className="text-sm font-medium text-fg">{dict.newsletter.title}</p>
            <p className="mb-3 mt-1 text-xs text-muted">{dict.newsletter.body}</p>
            <NewsletterForm t={dict.newsletter} locale={locale} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">{col.title}</h3>
              <ul className="mt-4 grid gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-fg-soft transition-colors hover:text-accent-fg">
                      <span className={"ltr" in l && l.ltr ? "ltr" : undefined}>{l.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-xs text-muted sm:flex-row">
          <p>
            {fill(t.rights, { year: 2026 })} <span className="mx-2 text-border-strong">/</span>
            <span className="text-fg-soft">{dict.common.promise}</span>
          </p>
          <div className="flex items-center gap-4">
            <span className="font-mono">{t.madeIn}</span>
            <ul className="flex items-center gap-1">
              {socials.map(({ label, href: url, Icon }) => (
                <li key={label}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
