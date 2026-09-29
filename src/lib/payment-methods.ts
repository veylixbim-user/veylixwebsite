/**
 * Payment methods the checkout can offer. Safe to import from client components (no server-only code).
 *
 *  card          Visa, Mastercard and Meeza cards — entered on Paymob's secure page, never on this site
 *  wallet        Vodafone Cash, Orange Cash, e& money, WE Pay
 *  instapay      InstaPay paid through Paymob (confirmed instantly)
 *  kiosk         Fawry / Aman / Masary: a reference number paid at a shop or in a Fawry app
 *  installments  valU, Sympl, bank installment plans
 *  transfer      a manual InstaPay transfer that the store owner checks by hand
 */
export const ONLINE_METHODS = ["card", "wallet", "instapay", "kiosk", "installments"] as const;
export type OnlineMethod = (typeof ONLINE_METHODS)[number];

export const PAYMENT_METHODS = [...ONLINE_METHODS, "transfer"] as const;
export type PaymentChoice = (typeof PAYMENT_METHODS)[number];

export type MethodAvailability = Record<PaymentChoice, boolean>;

export const NO_METHODS: MethodAvailability = { card: false, wallet: false, instapay: false, kiosk: false, installments: false, transfer: true };

export function isOnlineMethod(value: unknown): value is OnlineMethod {
  return typeof value === "string" && (ONLINE_METHODS as readonly string[]).includes(value);
}

export function isPaymentChoice(value: unknown): value is PaymentChoice {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function anyOnline(m: MethodAvailability) {
  return ONLINE_METHODS.some((k) => m[k]);
}

/** English labels for the admin panel and emails; the storefront uses the translated dictionaries. */
export const METHOD_LABEL: Record<PaymentChoice, string> = {
  card: "Card (Visa / Mastercard / Meeza)",
  wallet: "Mobile wallet",
  instapay: "InstaPay (online)",
  kiosk: "Fawry / Aman / Masary",
  installments: "Installments",
  transfer: "InstaPay transfer",
};
