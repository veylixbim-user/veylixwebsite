import type { Dictionary } from "@/i18n/dictionaries/en";
import { contact } from "@/lib/site";
import { SectionHeader } from "@/components/ui/section";
import { FaqList } from "./faq";

export function FaqSection({ dict, activationDays }: { dict: Dictionary; activationDays: number }) {
  const t = dict.faq;
  const items = t.items.map((i) => ({ q: i.q, a: i.a.replaceAll("{days}", String(activationDays)) }));
  const [before, after] = t.sub.split("{email}");
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative cv-auto scroll-mt-20 py-20 sm:py-24">
      <div className="container-page grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeader
            id="faq-title"
            align="start"
            eyebrow={t.eyebrow}
            title={t.title}
            sub={
              <>
                {before}
                <a href={`mailto:${contact.support}`} className="ltr text-accent-fg underline decoration-[color-mix(in_oklab,var(--accent)_45%,transparent)] underline-offset-4 hover:decoration-current">
                  {contact.support}
                </a>
                {after}
              </>
            }
          />
        </div>
        <div className="lg:col-span-8">
          <FaqList items={items} />
        </div>
      </div>
    </section>
  );
}
