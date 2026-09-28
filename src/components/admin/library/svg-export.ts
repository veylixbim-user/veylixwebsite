/**
 * Turns a live, CSS-variable driven SVG into a standalone file: theme colors are resolved to real values,
 * element ids are made file-safe, and (optionally) the VEYLIX draw/glow keyframes are embedded so the
 * exported file animates on its own in a browser, PowerPoint or Figma.
 */

const COLOR_ATTRS = ["fill", "stroke", "stop-color", "flood-color", "lighting-color"] as const;

const ANIMATION_CSS = `
.art-trace{stroke-dasharray:1;stroke-dashoffset:1;animation:vx-redraw 1.2s cubic-bezier(.65,0,.35,1) forwards}
.art-delay{animation-delay:.15s}
.art-lux{opacity:.25;animation:vx-lux 1.2s ease forwards}
.draw{stroke-dasharray:1;stroke-dashoffset:1;animation:vx-redraw var(--dur,1.6s) cubic-bezier(.65,0,.35,1) var(--delay,0s) forwards}
.appear{opacity:0;animation:vx-appear .5s ease var(--delay,0s) forwards}
@keyframes vx-redraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes vx-lux{from{opacity:.25}to{opacity:1}}
@keyframes vx-appear{to{opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;opacity:1!important;stroke-dashoffset:0!important}}`;

function needsResolve(value: string | null) {
  return !!value && (value.includes("var(") || value.includes("color-mix") || value === "currentColor" || value === "currentcolor");
}

function insideSymbol(el: Element) {
  return !!el.closest("symbol");
}

export type ExportOptions = { animated?: boolean; background?: string | null; scale?: number };

export function serializeSvg(svg: SVGSVGElement, opts: ExportOptions = {}): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...Array.from(svg.querySelectorAll("*"))];
  const dst = [clone, ...Array.from(clone.querySelectorAll("*"))];

  src.forEach((el, i) => {
    const out = dst[i] as SVGElement;
    const cs = getComputedStyle(el);
    for (const attr of COLOR_ATTRS) {
      const raw = el.getAttribute(attr);
      // currentColor inside <symbol> must stay live: it takes the colour of each <use>.
      if (needsResolve(raw) && !(insideSymbol(el) && /^currentcolor$/i.test(raw ?? ""))) out.setAttribute(attr, cs.getPropertyValue(attr));
    }
    if (el.tagName === "svg" || el.tagName === "use" || el.getAttribute("class")?.includes("text-")) out.setAttribute("color", cs.color);
    const font = el.getAttribute("font-family");
    if (font?.includes("var(")) out.setAttribute("font-family", `${cs.fontFamily}, ui-monospace, monospace`);
    // Resolve colours set through inline styles (e.g. style={{ background: ... }} or fill via style).
    const style = (el as SVGElement).style;
    if (style) {
      for (const prop of ["fill", "stroke", "stop-color"]) {
        const v = style.getPropertyValue(prop);
        if (needsResolve(v)) out.style.setProperty(prop, cs.getPropertyValue(prop));
      }
    }
    // Tailwind classes mean nothing outside the app; keep only the animation hooks.
    const cls = el.getAttribute("class");
    if (cls) {
      const keep = cls.split(/\s+/).filter((c) => ["art-trace", "art-delay", "art-lux", "draw", "appear"].includes(c));
      if (keep.length) out.setAttribute("class", keep.join(" "));
      else out.removeAttribute("class");
    }
  });

  // File-safe ids (React ids contain characters some editors reject).
  const ids = Array.from(clone.querySelectorAll("[id]"));
  const map = new Map<string, string>();
  ids.forEach((node, i) => {
    const next = `vx${i}`;
    map.set(node.id, next);
    node.id = next;
  });
  if (map.size) {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const node of [clone, ...Array.from(clone.querySelectorAll("*"))]) {
      for (const attr of Array.from(node.attributes)) {
        if (!attr.value.includes("#")) continue;
        let v = attr.value;
        for (const [from, to] of map) v = v.replace(new RegExp(`#${esc(from)}(?![\\w-])`, "g"), `#${to}`);
        if (v !== attr.value) node.setAttribute(attr.name, v);
      }
    }
  }

  const vb = svg.viewBox.baseVal;
  const w = vb && vb.width ? vb.width : svg.clientWidth || 240;
  const h = vb && vb.height ? vb.height : svg.clientHeight || 120;
  if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const scale = opts.scale ?? 2;
  clone.setAttribute("width", String(Math.round(w * scale)));
  clone.setAttribute("height", String(Math.round(h * scale)));
  clone.removeAttribute("aria-hidden");
  clone.removeAttribute("role");
  clone.removeAttribute("style");

  if (opts.background) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(vb?.x ?? 0));
    rect.setAttribute("y", String(vb?.y ?? 0));
    rect.setAttribute("width", String(w));
    rect.setAttribute("height", String(h));
    rect.setAttribute("fill", opts.background);
    clone.insertBefore(rect, clone.firstChild);
  }
  if (opts.animated && clone.querySelector(".art-trace, .art-lux, .draw, .appear")) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = ANIMATION_CSS;
    clone.insertBefore(style, clone.firstChild);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}\n`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function svgToPng(svgText: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render the SVG."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
