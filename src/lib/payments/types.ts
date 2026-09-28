export type PaymentMethod = "card" | "fawry" | "wallet" | "instapay";

export type PaymentRequest = {
  orderId: string;
  /** Total in EGP including VAT. */
  amount: number;
  customer: { name: string; email: string; phone: string };
  description: string;
};

export type PaymentResult =
  | { status: "paid" }
  | { status: "pending"; reference: string; expiresInHours: number }
  | { status: "redirect"; url: string };

export interface PaymentProvider {
  readonly id: "paymob" | "fawry" | "demo";
  isConfigured(): boolean;
  createPayment(req: PaymentRequest, method: PaymentMethod): Promise<PaymentResult>;
}
