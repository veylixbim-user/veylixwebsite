import "server-only";
import type { PaymentProvider } from "./types";

/**
 * Fawry adapter ("Pay at Fawry" reference codes, 48-hour expiry).
 *
 * SCAFFOLD — not wired to the live API yet. To go live:
 *  1. Create a charge request with your merchant code, `merchantRefNum = orderId`,
 *     amount in EGP and a SHA-256 signature using your security key.
 *  2. Return `{ status: "pending", reference, expiresInHours: 48 }` with Fawry's reference number.
 *  3. Add a server-notification route that verifies Fawry's signature, then issues license keys.
 * Follow FawryPay's current API reference for exact endpoints and signature order.
 */
export const fawry: PaymentProvider = {
  id: "fawry",
  isConfigured() {
    return Boolean(process.env.FAWRY_MERCHANT_CODE && process.env.FAWRY_SECURITY_KEY);
  },
  async createPayment() {
    throw new Error("Fawry adapter is scaffolded but not implemented. See src/lib/payments/fawry.ts.");
  },
};
