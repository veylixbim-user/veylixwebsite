import "server-only";
import { cache } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import { applyManualPaymentCopy } from "./manual-payment-copy";
import { anyOnline } from "@/lib/payment-methods";
import { methodAvailability } from "@/lib/server/payments";
import { getSettingsSafe } from "@/lib/server/settings";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.en),
  ar: () => import("./dictionaries/ar").then((m) => m.ar),
};

/** True once at least one online method (card, wallet, …) is really switched on. */
const onlinePaymentsLive = cache(async () => anyOnline(methodAvailability(await getSettingsSafe())));

/** The dictionary for a language. While online payments aren't connected, payment wording is InstaPay-only (see manual-payment-copy.ts). */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const dict = await dictionaries[locale]();
  return (await onlinePaymentsLive()) ? dict : applyManualPaymentCopy(dict, locale);
}
