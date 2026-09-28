"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Stylized Level 02 power & lighting plan, drawn in SVG.
 * variant "before": devices only, nothing circuited.
 * variant "after":  circuited, tagged, home-runs to LP-2A.
 * animate: draws circuits in sequence (hero).
 */

const RECEPTACLES: [number, number][] = [
  [60, 140], [120, 140], [180, 140], [240, 140], [300, 140], [360, 140],
  [80, 30], [160, 30], [240, 30], [320, 30], [400, 30],
  [420, 370], [480, 370],
  [40, 300], [40, 350],
];

const LIGHTS: [number, number][] = [
  [70, 65], [150, 65], [230, 65], [310, 65], [390, 65],
  [70, 110], [150, 110], [230, 110], [310, 110], [390, 110],
  [461, 85], [524, 85], [587, 85],
  [70, 290], [150, 290], [230, 290], [310, 290],
  [70, 340], [150, 340], [230, 340], [310, 340],
];

const CIRCUITS = [
  { id: 1, d: "M60 140 H360 L376 156 V200 H590 V296", color: "var(--accent)", tag: { x: 196, y: 128, t: "LP-2A/1" } },
  { id: 2, d: "M390 65 H70 V110 H390 L410 130 V208 H597 V296", color: "#9b87ff", tag: { x: 228, y: 56, t: "LP-2A/4" } },
  { id: 3, d: "M461 85 H587 L610 108 V296", color: "var(--success)", tag: { x: 492, y: 76, t: "LP-2A/5" } },
  { id: 4, d: "M310 340 H70 V290 H310 V262 H604 V296", color: "#ffb547", tag: { x: 160, y: 331, t: "LP-2A/3" } },
  { id: 5, d: "M80 30 H400 L416 46 V192 H583 V296", color: "var(--accent)", tag: { x: 272, y: 22, t: "LP-2A/2" } },
  { id: 6, d: "M420 370 H480 L492 358 V330 H584", color: "#ff7ab6", tag: { x: 428, y: 362, t: "LP-2A/6" } },
];

const UNASSIGNED: [number, number][] = [
  [120, 140], [300, 140], [230, 65], [524, 85], [150, 340], [480, 370], [320, 30],
];

export function FloorPlan({
  variant,
  animate = false,
  className,
  showLabels = true,
}: {
  variant: "before" | "after";
  animate?: boolean;
  className?: string;
  showLabels?: boolean;
}) {
  const after = variant === "after";
  return (
    <svg viewBox="0 0 640 400" className={cn("block h-auto w-full", className)} role="img" aria-hidden="true">
      <defs>
        <symbol id="dev-light" viewBox="0 0 12 12" overflow="visible">
          <rect width="12" height="12" rx="1.5" fill="#0f1a26" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="0.9" />
        </symbol>
        <symbol id="dev-recept" viewBox="-5 -5 10 10" overflow="visible">
          <circle r="5" fill="#0f1a26" stroke="currentColor" strokeWidth="1.2" />
          <path d="M-2 -1.5 V1.5 M2 -1.5 V1.5" stroke="currentColor" strokeWidth="1" />
        </symbol>
        <pattern id="plan-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--plan-line)" strokeWidth="0.6" />
        </pattern>
        <pattern id="core-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V8" stroke="#2b3a4d" strokeWidth="1.2" />
        </pattern>
      </defs>

      <rect width="640" height="400" fill="var(--plan-bg)" />
      <rect width="640" height="400" fill="url(#plan-grid)" />

      {/* Walls */}
      <g fill="none" stroke="var(--plan-wall)" strokeWidth="3" strokeLinecap="square">
        <rect x="20" y="20" width="600" height="360" />
        <path d="M20 150 H250 M290 150 H440 M470 150 H620" />
        <path d="M20 250 H250 M290 250 H520 M550 250 H620" />
        <path d="M430 20 V150 M493 20 V150 M556 20 V150" />
        <path d="M400 250 V380 M500 250 V380" />
      </g>
      <rect x="270" y="165" width="100" height="70" fill="url(#core-hatch)" stroke="var(--plan-wall)" strokeWidth="2" />

      {showLabels ? (
        <g fontFamily="var(--font-jetbrains-mono), monospace" fontSize="8.5" fill="#5f7188" letterSpacing="0.08em">
          <text x="30" y="96">OPEN OFFICE 2.10</text>
          <text x="438" y="140">MTG 2.01</text>
          <text x="501" y="140">MTG 2.02</text>
          <text x="564" y="140">MTG 2.03</text>
          <text x="30" y="318">OPEN OFFICE 2.20</text>
          <text x="408" y="268">PANTRY</text>
          <text x="508" y="268">ELEC 2.05</text>
          <text x="290" y="204">CORE</text>
        </g>
      ) : null}

      {/* Circuits */}
      {after ? (
        <g fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          {CIRCUITS.map((c, i) => (
            <path
              key={`g${c.id}`}
              d={c.d}
              stroke={c.color}
              strokeWidth={7}
              strokeOpacity={0.16}
              pathLength={1}
              className={animate ? "draw" : undefined}
              style={animate ? ({ "--delay": `${0.5 + i * 0.28}s`, "--dur": "1.5s" } as CSSProperties) : undefined}
            />
          ))}
          {CIRCUITS.map((c, i) => (
            <path
              key={c.id}
              d={c.d}
              stroke={c.color}
              pathLength={1}
              className={animate ? "draw" : undefined}
              style={animate ? ({ "--delay": `${0.5 + i * 0.28}s`, "--dur": "1.5s" } as CSSProperties) : undefined}
              opacity={0.95}
            />
          ))}
        </g>
      ) : null}

      {/* Devices */}
      <g color={after ? "#cfe9ff" : "#7d8da3"}>
        {LIGHTS.map(([x, y], i) => (
          <use key={`l${i}`} href="#dev-light" x={x - 6} y={y - 6} width="12" height="12" />
        ))}
        {RECEPTACLES.map(([x, y], i) => (
          <use key={`r${i}`} href="#dev-recept" x={x - 5} y={y - 5} width="10" height="10" />
        ))}
      </g>

      {/* Panel LP-2A */}
      <g>
        <rect x="580" y="296" width="36" height="46" rx="2" fill="#10263b" stroke={after ? "var(--accent)" : "#7d8da3"} strokeWidth="1.5" />
        <path d="M586 306 H610 M586 314 H610 M586 322 H610 M586 330 H610" stroke={after ? "var(--accent)" : "#5f7188"} strokeWidth="1" opacity="0.7" />
        <text x="598" y="356" textAnchor="middle" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="9" fontWeight="600" fill={after ? "var(--accent)" : "#7d8da3"}>
          LP-2A
        </text>
      </g>

      {/* Tags */}
      {after ? (
        <g fontFamily="var(--font-jetbrains-mono), monospace" fontSize="8" fontWeight="600">
          {CIRCUITS.map((c, i) => (
            <g
              key={`t${c.id}`}
              className={animate ? "appear" : undefined}
              style={animate ? ({ "--delay": `${1.4 + i * 0.28}s` } as CSSProperties) : undefined}
            >
              <rect x={c.tag.x - 3} y={c.tag.y - 8} width={c.tag.t.length * 5.1 + 6} height="11" rx="2" fill="#0a121c" stroke={c.color} strokeWidth="0.8" />
              <text x={c.tag.x} y={c.tag.y} fill={c.color}>
                {c.tag.t}
              </text>
            </g>
          ))}
        </g>
      ) : (
        <g fontFamily="var(--font-jetbrains-mono), monospace" fontSize="7.5" fontWeight="600">
          {UNASSIGNED.map(([x, y], i) => (
            <g key={`u${i}`} transform={`translate(${x + 7} ${y - 16})`}>
              <path d="M0 9 L5 0 L10 9 Z" fill="#ffb547" />
              <path d="M5 3.2 V6" stroke="#0a121c" strokeWidth="1.2" />
              <circle cx="5" cy="7.6" r="0.6" fill="#0a121c" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
