import type { CSSProperties } from "react";

const TRACES = [
  "M-20 120 H180 L240 180 H420",
  "M-20 300 H120 L200 220 H360 L400 180",
  "M1460 90 H1240 L1180 150 H1010",
  "M1460 280 H1320 L1250 210 H1080 L1040 170",
  "M300 -20 V60 L360 120 H480",
  "M1140 -20 V40 L1080 100 H960",
];

const NODES: [number, number][] = [
  [420, 180],
  [400, 180],
  [1010, 150],
  [1040, 170],
  [480, 120],
  [960, 100],
];

/** The hero background: circuit traces that draw themselves in, then light up their end nodes. */
export function CircuitTraces({ className, preserveAspectRatio = "xMidYMin slice" }: { className?: string; preserveAspectRatio?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 520" preserveAspectRatio={preserveAspectRatio} fill="none" aria-hidden>
      <g stroke="var(--accent)" strokeWidth="1.2" strokeLinejoin="round" opacity="0.55">
        {TRACES.map((d, i) => (
          <path key={i} d={d} pathLength={1} className="draw" style={{ "--delay": `${0.2 + i * 0.15}s`, "--dur": "1.8s" } as CSSProperties} />
        ))}
      </g>
      <g fill="var(--accent)">
        {NODES.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" className="appear" style={{ "--delay": `${1.6 + i * 0.12}s` } as CSSProperties} />
        ))}
      </g>
    </svg>
  );
}
