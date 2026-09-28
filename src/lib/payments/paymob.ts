import "server-only";
import type { PaymentProvider } from "./types";

/**
 * Paymob adapter (cards, Meeza, mobile wallets incl. Vodafone Cash, InstaPay).
 *
 * SCAFFOLD — not wired to the live API yet. To go live:
 *  1. Create an Intention with your secret key, the amount in piasters, currency "EGP",
 *     your integration IDs, billing data and `special_reference = orderId`.
 *  2. Return `{ status: "redirect", url }` pointing at Paymob's hosted checkout.
 *  3. Add a webhook route that verifies Paymob's HMAC, then issues license keys.
 * Follow Paymob's current API reference for exact endpoints and field names.
 */
export const paymob: PaymentProvider = {
  id: "paymob",
  isConfigured() {
    return Boolean(process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY && process.env.PAYMOB_INTEGRATION_IDS);
  },
  async createPayment() {
    throw new Error("Paymob adapter is scaffolded but not implemented. See src/lib/payments/paymob.ts.");
  },
};
