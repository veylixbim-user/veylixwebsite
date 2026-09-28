import "server-only";
import { fawryReference } from "@/lib/server/ids";
import { fawry } from "./fawry";
import { paymob } from "./paymob";
import type { PaymentMethod, PaymentProvider, PaymentRequest, PaymentResult } from "./types";

/** Demo provider: used until real credentials are configured. Never charges anything. */
const demo: PaymentProvider = {
  id: "demo",
  isConfigured: () => true,
  async createPayment(_req: PaymentRequest, method: PaymentMethod): Promise<PaymentResult> {
    if (method === "fawry") return { status: "pending", reference: fawryReference(), expiresInHours: 48 };
    return { status: "paid" };
  },
};

export function providerFor(method: PaymentMethod): PaymentProvider {
  const real = method === "fawry" ? fawry : paymob;
  return real.isConfigured() ? real : demo;
}

export function isDemoMode() {
  return !paymob.isConfigured() && !fawry.isConfigured();
}

export type { PaymentMethod, PaymentResult } from "./types";
