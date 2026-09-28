"use client";

import * as React from "react";
import { animate, useInView } from "motion/react";

/** Server renders the final value; on the client it counts up once when scrolled into view. */
export function Counter({ value, decimals = 0, suffix = "", className }: { value: number; decimals?: number; suffix?: string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const format = React.useCallback(
    (v: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v) + suffix,
    [decimals, suffix],
  );

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [inView, value, format]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
