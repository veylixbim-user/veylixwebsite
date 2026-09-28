import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Lightbulb, Mail } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageMetadata } from "@/lib/metadata";
import { contact } from "@/lib/site";
import { fill } from "@/lib/utils";
import { PageHero } from "@/components/ui/page-hero";
import { ContactForm } from "@/components/forms/contact-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return pageMetadata(locale, "/contact", dict.contactPage.title, fill(dict.contactPage.sub, { email: contact.email }));
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.contactPage;

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} sub={fill(t.sub, { email: contact.email })} />
      <div className="container-page grid gap-6 pb-16 lg:grid-cols-12">
        <aside className="grid content-start gap-4 lg:col-span-4">
          <div className="rounded-2xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-surface p-6">
            <span className="inline-flex size-11 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_9%,var(--surface))] text-accent-fg">
              <Mail className="size-5" aria-hidden />
            </span>
            <p className="mt-4 text-sm text-muted">{t.emailLabel}</p>
            <a href={`mailto:${contact.email}`} className="ltr mt-1 block text-lg font-semibold text-fg [overflow-wrap:anywhere] hover:text-accent-fg">
              {contact.email}
            </a>
            <p className="mt-4 flex gap-2 text-sm text-muted">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t.responseTime}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="flex items-center gap-2 font-semibold">
              <Lightbulb className="size-4 text-accent-fg" aria-hidden />
              {t.tipsTitle}
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-fg-soft">
              {t.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <section aria-labelledby="contact-form-title" className="rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:col-span-8">
          <h2 id="contact-form-title" className="mb-6 text-xl font-semibold">
            {t.formTitle}
          </h2>
          <ContactForm t={t.form} errorsT={dict.checkout.errors} locale={locale} topics={t.topics} topicLabel={t.topic} messageError={t.messageError} />
        </section>
      </div>
    </>
  );
}
