/** Built-in animated artwork the admin can assign to a product (or download from the design library). */
export const ART_IDS = ["circuit", "conduit", "panel", "lighting", "tag", "bundle", "wiring", "tray", "plugin"] as const;
export type ArtId = (typeof ART_IDS)[number];
export type ArtAccent = "cyan" | "violet" | "mint";

export const ART: Record<ArtId, { label: string; accent: ArtAccent }> = {
  circuit: { label: "Circuit traces", accent: "cyan" },
  conduit: { label: "Conduit route", accent: "violet" },
  panel: { label: "Panel schedule", accent: "cyan" },
  lighting: { label: "Lighting grid", accent: "mint" },
  tag: { label: "Element tags", accent: "violet" },
  bundle: { label: "Bundle", accent: "cyan" },
  wiring: { label: "Smart wiring", accent: "cyan" },
  tray: { label: "Cable tray", accent: "violet" },
  plugin: { label: "Plugin", accent: "mint" },
};

export function isArtId(value: unknown): value is ArtId {
  return typeof value === "string" && (ART_IDS as readonly string[]).includes(value);
}
