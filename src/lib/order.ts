import type { CartItem } from "./pricing";

/** Order returned by /api/checkout and rendered on the success page. */
export type Order = {
  id: string;
  createdAt: string;
  status: "paid" | "pending";
  method: "card" | "fawry" | "wallet" | "instapay";
  fawryReference?: string;
  customer: { name: string; email: string; phone: string };
  business?: { company: string; taxId: string; address: string };
  items: (CartItem & { unitPrice: number; lineTotal: number; licenseKeys: string[] })[];
  subtotal: number;
  vat: number;
  total: number;
  invoice: {
    number: string;
    seller: { name: string; taxId: string; address: string };
  };
  demo: boolean;
};

export const ORDER_STORAGE_KEY = "veylix-last-order";
