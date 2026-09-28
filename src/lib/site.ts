export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://veylix.com").replace(/\/$/, "");

export const social = {
  linkedin: "https://www.linkedin.com/company/veylix",
  youtube: "https://www.youtube.com/@veylix",
  github: "https://github.com/veylix",
};

export const contact = {
  sales: "sales@veylix.com",
  support: "support@veylix.com",
};

export const currentRelease = {
  version: "3.4.2",
  date: "2026-09-15",
};

/**
 * PLACEHOLDER social proof — replace with real, approved customer logos before launch.
 * Rendered as neutral wordmarks in the hero trust strip.
 */
export const trustedBy = [
  { name: "NORTHGRID", style: "tracking-[0.3em] font-semibold" },
  { name: "Axial MEP", style: "font-semibold italic" },
  { name: "KAIROS", style: "tracking-[0.2em] font-bold" },
  { name: "helio/build", style: "font-mono font-medium" },
  { name: "STRATA", style: "tracking-[0.35em] font-light" },
  { name: "Obelisk Eng.", style: "font-semibold" },
  { name: "DELTAWORKS", style: "tracking-[0.15em] font-bold" },
  { name: "Meridian", style: "font-medium italic" },
];
