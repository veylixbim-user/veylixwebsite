import type { Locale } from "@/i18n/config";

/**
 * Western Arabic numerals with comma thousands in every locale — by design,
 * for international readability (4,199 rather than ٤٬١٩٩).
 */
const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatNumber(value: number) {
  return numberFormat.format(value);
}

export function formatAmount(value: number, withDecimals = false) {
  return withDecimals ? decimalFormat.format(value) : numberFormat.format(value);
}

export const currencyLabel: Record<Locale, string> = {
  en: "EGP",
  ar: "ج.م",
};

/** "EGP 4,199" / "ج.م 4,199" — currency always precedes the number. */
export function formatEGP(value: number, locale: Locale, withDecimals = false) {
  return `${currencyLabel[locale]} ${formatAmount(value, withDecimals)}`;
}

export function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
