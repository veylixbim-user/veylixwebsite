import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/lib/format";
import { href } from "@/lib/links";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

const DOCS = ["terms", "privacy", "refunds", "eula"] as const;
type Doc = (typeof DOCS)[number];
const UPDATED = "2026-09-01";

export const dynamicParams = false;
export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

function isDoc(d: string): d is Doc {
  return (DOCS as readonly string[]).includes(d);
}

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/[doc]">): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!isLocale(locale) || !isDoc(doc)) return {};
  const dict = await getDictionary(locale);
  const d = dict.legal.docs[doc];
  return pageMetadata(locale, `/legal/${doc}`, d.title, d.sections[0].p);
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal/[doc]">) {
  const { locale, doc } = await params;
  if (!isLocale(locale) || !isDoc(doc)) notFound();
  const dict = await getDictionary(locale);
  const d = dict.legal.docs[doc];

  return (
    <div className="container-page grid gap-10 pt-28 pb-8 sm:pt-36 lg:grid-cols-12">
      <nav aria-label={dict.footer.columns.legal} className="lg:col-span-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{dict.footer.columns.legal}</p>
        <ul className="mt-4 grid gap-1">
          {DOCS.map((key) => (
            <li key={key}>
              <Link
                href={href(locale, `/legal/${key}`)}
                aria-current={key === doc ? "page" : undefined}
                className={cn("block rounded-lg px-3 py-2 text-sm transition-colors", key === doc ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}
              >
                {dict.legal.docs[key].title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="lg:col-span-8">
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">{d.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {dict.legal.updated}: <time dateTime={UPDATED}>{formatDate(UPDATED, locale)}</time>
        </p>
        <div className="mt-10 grid gap-8">
          {d.sections.map((s, i) => (
            <section key={s.h}>
              <h2 className="text-lg font-semibold">
                <span className="me-2 font-mono text-sm text-accent-fg">{String(i + 1).padStart(2, "0")}</span>
                {s.h}
              </h2>
              <p className="mt-2 leading-relaxed text-fg-soft">{s.p}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
