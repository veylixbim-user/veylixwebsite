"use client";

import * as React from "react";
import { ChevronsLeftRight } from "lucide-react";
import { FloorPlan } from "./floor-plan";

export function BeforeAfter({ before, after, label }: { before: string; after: string; label: string }) {
  const [pos, setPos] = React.useState(50);
  const ref = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  const update = React.useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(96, Math.max(4, pct)));
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 4;
    if (e.key === "ArrowLeft") setPos((p) => Math.max(4, p - step));
    else if (e.key === "ArrowRight") setPos((p) => Math.min(96, p + step));
    else if (e.key === "Home") setPos(4);
    else if (e.key === "End") setPos(96);
    else return;
    e.preventDefault();
  }

  return (
    <div
      dir="ltr"
      ref={ref}
      className="relative select-none overflow-hidden rounded-2xl border border-[#243042] bg-[#0b1017] shadow-[var(--shadow-lg)] touch-pan-y"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && update(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <FloorPlan variant="before" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <FloorPlan variant="after" />
      </div>

      <span className="pointer-events-none absolute start-3 top-3 rounded-md border border-[#3a2f14] bg-[#1a150a]/90 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#ffb547]">
        {before}
      </span>
      <span className="pointer-events-none absolute end-3 top-3 rounded-md border border-[#1f3a4a] bg-[#0a121c]/90 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
        {after}
      </span>

      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -translate-x-1/2 w-px bg-accent shadow-[0_0_12px_var(--accent)]" />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="absolute top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-accent/60 bg-[#0a121c] text-accent shadow-[0_0_24px_-4px_var(--accent)] outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{ left: `${pos}%` }}
      >
        <ChevronsLeftRight className="size-4" aria-hidden />
      </div>
    </div>
  );
}
