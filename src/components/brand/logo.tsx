import { useId } from "react";
import { cn } from "@/lib/utils";

const BLADES = [
  "M43.1 18 L50 14 L64.7 22.5 L64.7 34.3 L67.6 42.9",
  "M74.3 28 L81.2 32 L81.2 48.9 L70.9 54.8 L65 61.7",
  "M81.2 60.1 L81.2 68 L66.5 76.5 L56.3 70.6 L47.4 68.8",
  "M56.9 82 L50 86 L35.3 77.5 L35.3 65.7 L32.4 57.1",
  "M25.7 72 L18.8 68 L18.8 51.1 L29.1 45.2 L35 38.3",
  "M18.8 39.9 L18.8 32 L33.5 23.5 L43.7 29.4 L52.6 31.2",
];

/** The VEYLIX mark: neon circuit aperture around a power symbol, inside a hexagon. */
export function LogoMark({ className, glow = true, animated = false }: { className?: string; glow?: boolean; animated?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" className={cn("shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-hex`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1F4C86" />
          <stop offset="1" stopColor="#0B1D3B" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A6FB0" />
          <stop offset="1" stopColor="#0A1830" />
        </linearGradient>
        {glow ? (
          <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
      </defs>
      <path
        d="M50 4 L89.8 27 L89.8 73 L50 96 L10.2 73 L10.2 27 Z"
        fill={`url(#${id}-hex)`}
        stroke={`url(#${id}-rim)`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <g fill="none" strokeLinejoin="miter" strokeLinecap="square" filter={glow ? `url(#${id}-glow)` : undefined}>
        <g stroke="#3CF2FF" strokeWidth="6.4">
          {BLADES.map((d, i) => (
            <path key={i} d={d} pathLength={1} className={animated ? "draw" : undefined} style={animated ? ({ "--delay": `${i * 0.08}s`, "--dur": "1.1s" } as React.CSSProperties) : undefined} />
          ))}
        </g>
        <g stroke="#112B52" strokeWidth="3.4">
          {BLADES.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g stroke="#3CF2FF" strokeWidth="2.4" strokeLinecap="round">
          <path d="M44.8 43.6 A8.6 8.6 0 1 0 55.2 43.6" />
          <path d="M50 38.6 L50 48.2" />
        </g>
      </g>
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-8", markClassName)} />
      <span className="ltr font-mono text-[15px] font-semibold tracking-[0.24em] text-fg">VEYLIX</span>
    </span>
  );
}
