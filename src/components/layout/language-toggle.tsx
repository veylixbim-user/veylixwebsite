"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { swapLocale } from "@/lib/links";
import { cn } from "@/lib/utils";

export function LanguageToggle({
  locale,
  label,
  short,
  name,
  variant = "compact",
  className,
}: {
  locale: Locale;
  label: string;
  short: string;
  name: string;
  variant?: "compact" | "full";
  className?: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const target: Locale = locale === "en" ? "ar" : "en";

  return (
    <Link
      href={swapLocale(pathname, target)}
      hrefLang={target}
      lang={target}
      aria-label={label}
      title={label}
      prefetch={false}
      onClick={() => {
        document.cookie = `veylix-locale=${target};path=/;max-age=31536000;samesite=lax`;
      }}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      {variant === "full" ? <span>{name}</span> : <span className={target === "ar" ? "font-[family-name:var(--font-ar)] text-[15px]" : ""}>{short}</span>}
    </Link>
  );
}
