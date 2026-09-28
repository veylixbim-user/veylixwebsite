import type { Locale } from "@/i18n/config";

/** Prefix an internal path with the active locale: href("ar", "/pricing") → "/ar/pricing". */
export function href(locale: Locale, path = "/") {
  if (path.startsWith("#")) return `/${locale}${path}`;
  return `/${locale}${path === "/" ? "" : path}`;
}

/** Swap the locale segment of a pathname. */
export function swapLocale(pathname: string, to: Locale) {
  const parts = pathname.split("/");
  parts[1] = to;
  return parts.join("/") || `/${to}`;
}
