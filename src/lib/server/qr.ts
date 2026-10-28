import "server-only";

const cache = new Map<string, string>();

/** A QR code (inline SVG, theme-independent black on white) for a link, or "" when there is nothing to encode. */
export async function qrSvg(text: string): Promise<string> {
  if (!text || text.length > 500) return "";
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  try {
    const { toString } = await import("qrcode");
    const svg = await toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
    if (cache.size > 20) cache.clear();
    cache.set(text, svg);
    return svg;
  } catch {
    return "";
  }
}
