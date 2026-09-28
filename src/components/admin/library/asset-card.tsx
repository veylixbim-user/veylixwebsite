"use client";

import * as React from "react";
import { Check, Code2, Download, ImageDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBlob, serializeSvg, svgToPng } from "./svg-export";

type Background = "none" | "dark" | "light";
const BACKGROUNDS: Record<Background, string | null> = { none: null, dark: "#0b1017", light: "#ffffff" };

const LibraryContext = React.createContext<{ background: Background; animated: boolean }>({ background: "none", animated: true });

/** Export preferences shared by every card on the library page. */
export function LibraryOptions({ children }: { children: React.ReactNode }) {
  const [background, setBackground] = React.useState<Background>("none");
  const [animated, setAnimated] = React.useState(true);
  return (
    <LibraryContext.Provider value={{ background, animated }}>
      <div className="sticky top-0 z-20 -mx-4 mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">Export options</span>
        <div role="radiogroup" aria-label="Export background" className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-xs">
          {(Object.keys(BACKGROUNDS) as Background[]).map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={background === b}
              onClick={() => setBackground(b)}
              className={cn("rounded-md px-2.5 py-1 capitalize", background === b ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}
            >
              {b === "none" ? "Transparent" : `${b} background`}
            </button>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-fg-soft">
          <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Keep the animation in downloaded SVGs
        </label>
      </div>
      {children}
    </LibraryContext.Provider>
  );
}

function ToolButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-xs font-medium text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
    >
      {children}
    </button>
  );
}

/**
 * Live preview of one asset with replay and download actions. `exportSelector` picks the SVG to export
 * inside the preview; pass `exportable={false}` for HTML-based animations.
 */
export function AssetCard({
  title,
  note,
  fileName,
  children,
  exportable = true,
  exportSelector = "svg",
  replay = true,
  previewClassName,
  className,
}: {
  title: string;
  note?: React.ReactNode;
  fileName: string;
  children: React.ReactNode;
  exportable?: boolean;
  exportSelector?: string;
  replay?: boolean;
  previewClassName?: string;
  className?: string;
}) {
  const { background, animated } = React.useContext(LibraryContext);
  const ref = React.useRef<HTMLDivElement>(null);
  const [run, setRun] = React.useState(0);
  const [done, setDone] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const flash = (msg: string) => {
    setDone(msg);
    window.setTimeout(() => setDone(null), 1600);
  };

  const target = () => ref.current?.querySelector<SVGSVGElement>(exportSelector) ?? null;

  function exportSvg(withAnimation: boolean) {
    const svg = target();
    if (!svg) throw new Error("Nothing to export.");
    return { svg, text: serializeSvg(svg, { animated: withAnimation, background: BACKGROUNDS[background] }) };
  }

  async function onSvg() {
    setError(null);
    try {
      const { text } = exportSvg(animated);
      downloadBlob(new Blob([text], { type: "image/svg+xml" }), `${fileName}.svg`);
      flash("SVG saved");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onPng() {
    setError(null);
    try {
      const { svg, text } = exportSvg(false);
      const vb = svg.viewBox.baseVal;
      const w = vb?.width || svg.clientWidth;
      const h = vb?.height || svg.clientHeight;
      const scale = Math.min(8, 2400 / Math.max(w, h));
      const png = await svgToPng(text, Math.round(w * scale), Math.round(h * scale));
      downloadBlob(png, `${fileName}.png`);
      flash("PNG saved");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onCopy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(exportSvg(animated).text);
      flash("SVG code copied");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <figure className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface", className)}>
      <div ref={ref} key={run} className={cn("group art-play relative min-w-0", previewClassName)}>
        {children}
      </div>
      <figcaption className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          {note ? <p className="text-xs text-muted">{note}</p> : null}
          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {done ? (
            <span role="status" className="inline-flex items-center gap-1 text-xs text-success">
              <Check className="size-3.5" aria-hidden /> {done}
            </span>
          ) : null}
          {replay ? (
            <ToolButton onClick={() => setRun((n) => n + 1)} label="Replay the animation">
              <RotateCcw className="size-3.5" aria-hidden /> Replay
            </ToolButton>
          ) : null}
          {exportable ? (
            <>
              <ToolButton onClick={onSvg} label="Download as SVG">
                <Download className="size-3.5" aria-hidden /> SVG
              </ToolButton>
              <ToolButton onClick={onPng} label="Download as PNG">
                <ImageDown className="size-3.5" aria-hidden /> PNG
              </ToolButton>
              <ToolButton onClick={onCopy} label="Copy SVG code">
                <Code2 className="size-3.5" aria-hidden />
                <span className="sr-only">Copy SVG code</span>
              </ToolButton>
            </>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}
