import type { ArtId } from "./art";

/** Minimal product data shared with client components (cart, checkout, menus). No installer URLs. */
export type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  taglineEn: string;
  taglineAr: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  image: string | null;
  art: ArtId | null;
  hasFile: boolean;
};

export type Billing = "monthly" | "yearly";
