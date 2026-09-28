/**
 * Non-localized product + pricing data. Copy lives in the dictionaries
 * (src/i18n/dictionaries), keyed by the same slugs / plan ids.
 */

export const productSlugs = ["circuit", "conduit", "panel", "lighting", "tag", "bundle"] as const;
export type ProductSlug = (typeof productSlugs)[number];
export const pluginSlugs = ["circuit", "conduit", "panel", "lighting", "tag"] as const satisfies readonly ProductSlug[];
export type PluginSlug = (typeof pluginSlugs)[number];

export const revitVersions = ["2021", "2022", "2023", "2024", "2025"] as const;

export type Product = {
  slug: ProductSlug;
  name: string;
  version: string;
  standards: string[];
  /** Hue used for the card's accent glow. */
  accent: "cyan" | "violet" | "mint";
};

export const products: Record<ProductSlug, Product> = {
  circuit: {
    slug: "circuit",
    name: "VEYLIX Circuit",
    version: "3.4.2",
    standards: ["IEC 60364", "NEC 2023", "BS 7671", "ECP 306-1"],
    accent: "cyan",
  },
  conduit: {
    slug: "conduit",
    name: "VEYLIX Conduit",
    version: "3.4.0",
    standards: ["NEC 358", "IEC 61386", "BS EN 61537"],
    accent: "violet",
  },
  panel: {
    slug: "panel",
    name: "VEYLIX Panel",
    version: "3.3.5",
    standards: ["IEC 61439", "NEC 408", "ECP 306-1"],
    accent: "cyan",
  },
  lighting: {
    slug: "lighting",
    name: "VEYLIX Lighting",
    version: "3.2.1",
    standards: ["EN 12464-1", "IES RP-1", "LDT / IES"],
    accent: "mint",
  },
  tag: {
    slug: "tag",
    name: "VEYLIX Tag",
    version: "3.4.2",
    standards: ["ISO 19650", "BS 1192", "ISO 81346"],
    accent: "violet",
  },
  bundle: {
    slug: "bundle",
    name: "VEYLIX Bundle",
    version: "3.4.2",
    standards: ["IEC", "NEC", "BS 7671", "NF C 15-100", "ECP 306-1"],
    accent: "cyan",
  },
};

export const planIds = ["starter", "pro", "studio", "enterprise", "student"] as const;
export type PlanId = (typeof planIds)[number];
export type BillingCycle = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  /** EGP, VAT exclusive. `null` = custom quote. */
  price: Record<BillingCycle, number> | null;
  seats: number | null;
  plugins: "one" | "all";
  highlighted?: boolean;
};

export const plans: Record<PlanId, Plan> = {
  starter: { id: "starter", price: { monthly: 1499, yearly: 14399 }, seats: 1, plugins: "one" },
  pro: { id: "pro", price: { monthly: 4199, yearly: 40299 }, seats: 1, plugins: "all", highlighted: true },
  studio: { id: "studio", price: { monthly: 10499, yearly: 100799 }, seats: 5, plugins: "all" },
  enterprise: { id: "enterprise", price: null, seats: null, plugins: "all" },
  student: { id: "student", price: { monthly: 299, yearly: 2869 }, seats: 1, plugins: "all" },
};

/** Plans that can go straight into the cart. */
export const purchasablePlans = ["starter", "pro", "studio", "student"] as const satisfies readonly PlanId[];
export type PurchasablePlanId = (typeof purchasablePlans)[number];

export const VAT_RATE = 0.14;
export const TRIAL_DAYS = 14;

/** Reference rate for the optional "approximate price" hint shown to visitors outside Egypt. Billing is always EGP. */
export const EGP_PER_EUR = 53;
