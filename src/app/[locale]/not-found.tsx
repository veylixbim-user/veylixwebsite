import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

/** Bilingual on purpose: not-found boundaries don't receive route params. */
export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center pt-24 text-center">
      <LogoMark className="size-16 opacity-80" />
      <p className="mt-8 font-mono text-sm text-accent-fg">404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">This circuit is open.</h1>
      <p lang="ar" dir="rtl" className="mt-2 text-2xl font-semibold text-fg-soft">
        هذه الدائرة مفتوحة.
      </p>
      <p className="mt-5 max-w-md text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/en" className="rounded-xl border border-border-strong bg-surface-2 px-5 py-2.5 text-sm font-medium hover:bg-surface-3">
          Home
        </Link>
        <Link href="/ar" lang="ar" className="rounded-xl border border-border-strong bg-surface-2 px-5 py-2.5 text-sm font-medium hover:bg-surface-3">
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
