"use client";

import * as React from "react";

/** Tracks the pointer across `.spotlight` children and feeds --mx / --my to their glow. */
export function SpotlightGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  const onPointerMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".spotlight");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    card.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);
  return (
    <div className={className} onPointerMove={onPointerMove}>
      {children}
    </div>
  );
}
