"use client";

import * as React from "react";
import type { CSSProperties } from "react";
import { Cable, Route, Rows3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Electrical scenes drawn in SVG (theme colours via CSS variables, so they follow light/dark and can be exported from
 * the admin Design library). Animations are CSS only and respect prefers-reduced-motion.
 */

const AMBER = "#ffb547";
const PINK = "#ff7ab6";
const dly = (s: number) => ({ "--delay": `${s}s` }) as CSSProperties;

/* ----------------------------------------------------------------------------------------------------------- */
/* 1. Panel → cable tray → conduit → luminaires, sockets, equipment (interactive)                                */
/* ----------------------------------------------------------------------------------------------------------- */

export type SceneLayer = "wiring" | "conduit" | "tray" | "power";

const LIGHT_X = [230, 390, 550, 710];
const SOCKETS = [
  { x: 300, y: 336, c: "var(--accent)" },
  { x: 470, y: 318, c: "var(--violet)" },
  { x: 640, y: 300, c: "var(--success)" },
];

/** Routes from the panel. `kind` decides which layer draws it as pipe or tray. */
const ROUTES: { id: string; d: string; c: string; kind: "tray" | "conduit"; tag: string; tx: number; ty: number }[] = [
  { id: "L1", d: "M120 88 H230 V140", c: "var(--accent)", kind: "tray", tag: "L1 · lighting", tx: 140, ty: 62 },
  { id: "L2", d: "M120 88 H390 V140", c: "var(--accent)", kind: "tray", tag: "", tx: 0, ty: 0 },
  { id: "L3", d: "M120 88 H550 V140", c: "var(--accent)", kind: "tray", tag: "", tx: 0, ty: 0 },
  { id: "L4", d: "M120 88 H710 V140", c: "var(--accent)", kind: "tray", tag: "", tx: 0, ty: 0 },
  { id: "AC", d: "M120 88 H810 V170", c: AMBER, kind: "tray", tag: "AC-1 · 3Φ", tx: 742, ty: 62 },
  { id: "S1", d: "M120 336 H300 V372", c: "var(--accent)", kind: "conduit", tag: "S1", tx: 190, ty: 328 },
  { id: "S2", d: "M120 318 H470 V372", c: "var(--violet)", kind: "conduit", tag: "S2", tx: 340, ty: 310 },
  { id: "S3", d: "M120 300 H640 V372", c: "var(--success)", kind: "conduit", tag: "S3", tx: 520, ty: 292 },
  { id: "M1", d: "M120 282 H810 V304", c: PINK, kind: "conduit", tag: "P-1 · pump", tx: 690, ty: 274 },
];

function Panel({ live }: { live: boolean }) {
  return (
    <g>
      <rect x="30" y="140" width="90" height="210" rx="6" fill="var(--surface-2)" stroke={live ? "var(--accent)" : "var(--border-strong)"} strokeWidth="2" />
      <text x="75" y="372" textAnchor="middle" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="12" fontWeight="600" fill={live ? "var(--accent)" : "var(--muted)"}>
        LP-2A
      </text>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x="44" y={158 + i * 30} width="62" height="16" rx="3" fill="var(--surface-3)" stroke="var(--border-strong)" />
          <rect x="48" y={161 + i * 30} width="14" height="10" rx="2" fill={live ? "var(--success)" : "var(--border-strong)"} className={live ? "glow-on" : undefined} style={live ? dly(0.2 + i * 0.12) : undefined} />
          <path d={`M70 ${166 + i * 30} H100`} stroke="var(--muted)" strokeWidth="1.4" opacity=".6" />
        </g>
      ))}
    </g>
  );
}

function Devices({ live }: { live: boolean }) {
  return (
    <g>
      {/* luminaires */}
      {LIGHT_X.map((x, i) => (
        <g key={x}>
          {live ? (
            <path d={`M${x - 30} 150 L${x + 30} 150 L${x + 78} 330 L${x - 78} 330 Z`} fill="url(#es-cone)" className="glow-on" style={dly(0.6 + i * 0.35)} />
          ) : null}
          <rect x={x - 30} y="140" width="60" height="10" rx="3" fill={live ? "#fff6c9" : "var(--surface-3)"} stroke={live ? AMBER : "var(--border-strong)"} strokeWidth="1.4" className={live ? "glow-on" : undefined} style={live ? dly(0.6 + i * 0.35) : undefined} />
        </g>
      ))}
      {/* sockets */}
      {SOCKETS.map((s, i) => (
        <g key={s.x}>
          <rect x={s.x - 10} y="372" width="20" height="26" rx="3" fill="var(--surface-2)" stroke={live ? s.c : "var(--border-strong)"} strokeWidth="1.6" />
          <circle cx={s.x - 4} cy="385" r="2" fill={live ? s.c : "var(--muted)"} className={live ? "pulse-soft" : undefined} style={live ? dly(i * 0.3) : undefined} />
          <circle cx={s.x + 4} cy="385" r="2" fill={live ? s.c : "var(--muted)"} className={live ? "pulse-soft" : undefined} style={live ? dly(i * 0.3) : undefined} />
        </g>
      ))}
      {/* air-conditioner */}
      <g>
        <rect x="770" y="170" width="80" height="54" rx="6" fill="var(--surface-2)" stroke={live ? AMBER : "var(--border-strong)"} strokeWidth="1.6" />
        <circle cx="810" cy="197" r="16" fill="none" stroke={live ? AMBER : "var(--muted)"} strokeWidth="1.4" />
        <path d="M810 183 V211 M796 197 H824" stroke={live ? AMBER : "var(--muted)"} strokeWidth="1.4" className={live ? "spin" : undefined} style={{ transformOrigin: "810px 197px" }} />
      </g>
      {/* pump / motor */}
      <g>
        <circle cx="810" cy="332" r="28" fill="var(--surface-2)" stroke={live ? PINK : "var(--border-strong)"} strokeWidth="1.6" />
        <text x="810" y="337" textAnchor="middle" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="14" fontWeight="700" fill={live ? PINK : "var(--muted)"}>
          M
        </text>
      </g>
      <text x="810" y="378" textAnchor="middle" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="10" fill="var(--muted)">
        PUMP
      </text>
      <text x="810" y="242" textAnchor="middle" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="10" fill="var(--muted)">
        AC-1
      </text>
    </g>
  );
}

function Ladder({ draw }: { draw: boolean }) {
  const rungs = Array.from({ length: 30 }, (_, i) => 132 + i * 24);
  const cls = draw ? "draw" : undefined;
  return (
    <g stroke="var(--muted)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M60 140 V72 H862" pathLength={1} className={cls} style={draw ? { ...dly(0), "--dur": "1.6s" } as CSSProperties : undefined} />
      <path d="M90 140 V96 H862" pathLength={1} className={cls} style={draw ? { ...dly(0.15), "--dur": "1.6s" } as CSSProperties : undefined} />
      <g strokeWidth="1.4" opacity=".75">
        {rungs.map((x, i) => (
          <path key={x} d={`M${x} 72 V96`} className={draw ? "appear" : undefined} style={draw ? dly(0.3 + i * 0.05) : undefined} />
        ))}
        {[108, 124].map((y) => (
          <path key={y} d={`M60 ${y} H90`} />
        ))}
      </g>
    </g>
  );
}

export function PowerScene({ layer, className, labels }: { layer: SceneLayer; className?: string; labels?: { tray: string; conduit: string; load: string } }) {
  const power = layer === "power";
  const showTray = layer === "tray" || power;
  const showConduit = layer === "conduit" || power;
  const showWires = layer === "wiring" || power;
  return (
    <svg viewBox="0 0 900 440" className={cn("block h-auto w-full", className)} role="img" aria-label="Panel, cable tray, conduit, luminaires, sockets and equipment" data-anim>
      <defs>
        <linearGradient id="es-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={AMBER} stopOpacity=".38" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0" />
        </linearGradient>
        <pattern id="es-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0H0V30" fill="none" stroke="var(--plan-line)" strokeWidth=".6" />
        </pattern>
      </defs>
      <rect width="900" height="440" rx="14" fill="var(--plan-bg)" />
      <rect width="900" height="440" rx="14" fill="url(#es-grid)" />
      {/* ceiling and floor */}
      <path d="M20 44 H880 M20 404 H880" stroke="var(--border-strong)" strokeWidth="2" />
      <text x="880" y="36" textAnchor="end" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="10" fill="var(--muted)">CEILING</text>
      <text x="880" y="420" textAnchor="end" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="10" fill="var(--muted)">FLOOR</text>

      <Panel live={power} />
      <g key={`t-${layer}`}>{showTray ? <Ladder draw /> : <Ladder draw={false} />}</g>
      <Devices live={power} />

      {/* conduit: pipes with fittings */}
      <g key={`c-${layer}`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {ROUTES.filter((r) => r.kind === "conduit").map((r, i) => (
          <g key={r.id} opacity={showConduit ? 1 : 0}>
            <path d={r.d} stroke="var(--border-strong)" strokeWidth="9" pathLength={1} className={showConduit && !power ? "draw" : undefined} style={dly(i * 0.25)} />
            <path d={r.d} stroke="var(--plan-bg)" strokeWidth="5" pathLength={1} className={showConduit && !power ? "draw" : undefined} style={dly(i * 0.25)} />
          </g>
        ))}
        {/* drops from the tray to the luminaires and the air-conditioner */}
        {[...LIGHT_X, 810].map((x, i) => (
          <g key={x} opacity={showConduit || showTray ? 1 : 0}>
            <path d={`M${x} 96 V${x === 810 ? 170 : 140}`} stroke="var(--border-strong)" strokeWidth="7" pathLength={1} className={(showConduit || showTray) && !power ? "draw" : undefined} style={dly(0.4 + i * 0.12)} />
            <path d={`M${x} 96 V${x === 810 ? 170 : 140}`} stroke="var(--plan-bg)" strokeWidth="3" pathLength={1} className={(showConduit || showTray) && !power ? "draw" : undefined} style={dly(0.4 + i * 0.12)} />
          </g>
        ))}
      </g>

      {/* copper */}
      <g key={`w-${layer}`} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={showWires ? 1 : 0}>
        {ROUTES.map((r, i) => (
          <g key={r.id}>
            <path d={r.d} stroke={r.c} strokeWidth="6" strokeOpacity=".16" pathLength={1} className={showWires && !power ? "draw" : undefined} style={{ ...dly(0.2 + i * 0.2), "--dur": "1.4s" } as CSSProperties} />
            <path d={r.d} stroke={r.c} strokeWidth="2" pathLength={power ? undefined : 1} className={power ? "flow-dash" : showWires ? "draw" : undefined} style={{ ...dly(0.2 + i * 0.2), "--dur": "1.4s" } as CSSProperties} />
          </g>
        ))}
        {ROUTES.filter((r) => r.tag).map((r) => (
          <text key={r.id} x={r.tx} y={r.ty} fontFamily="var(--font-jetbrains-mono), monospace" fontSize="10" fontWeight="600" fill={r.c} className="appear" style={dly(1.2)}>
            {r.tag}
          </text>
        ))}
      </g>

      {/* captions */}
      {layer === "tray" && labels ? (
        <text x="470" y="62" textAnchor="middle" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="11" fill="var(--muted)" className="appear" style={dly(0.8)}>
          {labels.tray}
        </text>
      ) : null}
      {layer === "conduit" && labels ? (
        <text x="470" y="262" textAnchor="middle" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="11" fill="var(--muted)" className="appear" style={dly(0.8)}>
          {labels.conduit}
        </text>
      ) : null}
      {power && labels ? (
        <g className="appear" style={dly(2.4)}>
          <rect x="290" y="196" width="300" height="30" rx="8" fill="var(--surface)" stroke="var(--success)" strokeWidth="1.2" />
          <circle cx="308" cy="211" r="4" fill="var(--success)" className="pulse-soft" />
          <text x="322" y="215" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="11" fill="var(--fg-soft)">
            {labels.load}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

const LAYERS: { id: SceneLayer; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "wiring", icon: Cable },
  { id: "conduit", icon: Route },
  { id: "tray", icon: Rows3 },
  { id: "power", icon: Zap },
];

/** The scene with layer tabs. Cycles through the layers until the visitor picks one. */
export function PowerSceneTabs({ tabs, labels, caption }: { tabs: Record<SceneLayer, string>; labels: { tray: string; conduit: string; load: string }; caption: Record<SceneLayer, string> }) {
  const [layer, setLayer] = React.useState<SceneLayer>("wiring");
  const [auto, setAuto] = React.useState(true);
  const [visible, setVisible] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!auto || !visible) return;
    const t = window.setInterval(() => setLayer((l) => LAYERS[(LAYERS.findIndex((x) => x.id === l) + 1) % LAYERS.length].id), 5200);
    return () => window.clearInterval(t);
  }, [auto, visible]);

  return (
    <div ref={box} data-play={visible ? "1" : "0"}>
      <div role="tablist" aria-label="Layers" className="mx-auto mb-5 flex w-fit max-w-full flex-wrap justify-center gap-1.5 rounded-2xl border border-border bg-surface p-1.5">
        {LAYERS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={layer === id}
            onClick={() => {
              setAuto(false);
              setLayer(id);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
              layer === id ? "bg-surface-3 text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" aria-hidden /> {tabs[id]}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-[var(--plan-bg)] p-2 shadow-[0_30px_90px_-40px_var(--glow)]">
        <PowerScene layer={layer} labels={labels} />
      </div>
      <p className="mt-4 text-center text-sm text-muted" aria-live="polite">
        {caption[layer]}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */
/* 2. The plugin plugging into Revit                                                                             */
/* ----------------------------------------------------------------------------------------------------------- */

export function PluginPlug({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={cn("block h-auto w-full", className)} role="img" aria-label="A VEYLIX plugin clicking into the Revit ribbon" fill="none">
      {/* ribbon */}
      <rect x="10" y="30" width="300" height="100" rx="10" fill="var(--surface-2)" stroke="var(--border-strong)" />
      <path d="M10 56 H310" stroke="var(--border-strong)" />
      {[24, 44, 64, 84].map((x) => (
        <rect key={x} x={x} y="38" width="14" height="10" rx="2" fill="var(--surface-3)" />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={26 + i * 40} y="70" width="30" height="34" rx="5" fill="var(--surface-3)" stroke="var(--border-strong)" />
      ))}
      {/* the empty slot */}
      <rect x="160" y="66" width="120" height="50" rx="8" stroke="var(--accent)" strokeDasharray="4 4" strokeOpacity=".7" />
      <g fill="var(--accent)">
        <rect x="156" y="82" width="8" height="5" rx="1" opacity=".8" />
        <rect x="156" y="95" width="8" height="5" rx="1" opacity=".8" />
      </g>
      {/* the plugin card slides in, then a check pops */}
      <g className="plug-slide">
        <rect x="170" y="70" width="100" height="42" rx="8" fill="color-mix(in oklab, var(--accent) 14%, var(--surface))" stroke="var(--accent)" strokeWidth="1.6" />
        <path d="M188 84 L200 100 L212 84" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="222" y="95" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="10" fontWeight="700" fill="var(--fg)">VEYLIX</text>
        <rect x="160" y="83" width="12" height="5" rx="1" fill="var(--accent)" />
        <rect x="160" y="94" width="12" height="5" rx="1" fill="var(--accent)" />
      </g>
      <g className="plug-check">
        <circle cx="280" cy="70" r="12" fill="var(--success)" />
        <path d="M274 70 L279 75 L287 65" stroke="#04140c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="plug-spark" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
        <path d="M150 74 L142 68 M150 91 L138 91 M150 108 L142 114" />
      </g>
    </svg>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */
/* 3. Cable tray (ladder) with cables being laid                                                                 */
/* ----------------------------------------------------------------------------------------------------------- */

export function CableTrayRun({ className }: { className?: string }) {
  const rungs = Array.from({ length: 13 }, (_, i) => 30 + i * 20);
  return (
    <svg viewBox="0 0 320 160" className={cn("block h-auto w-full", className)} role="img" aria-label="Cable tray ladder with cables" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g stroke="var(--muted)" strokeWidth="2.2">
        <path d="M14 44 H250 L290 84 V140" />
        <path d="M14 70 H238 L264 96 V140" />
      </g>
      <g stroke="var(--muted)" strokeWidth="1.4" opacity=".7">
        {rungs.map((x) => (
          <path key={x} d={`M${x} 44 V70`} />
        ))}
      </g>
      {[
        { d: "M14 52 H248 L280 84 V140", c: "var(--accent)" },
        { d: "M14 58 H244 L273 88 V140", c: "var(--violet)" },
        { d: "M14 64 H241 L268 92 V140", c: "var(--success)" },
      ].map((w, i) => (
        <g key={i}>
          <path d={w.d} stroke={w.c} strokeWidth="5" strokeOpacity=".16" />
          <path d={w.d} stroke={w.c} strokeWidth="2" className="flow-dash" style={dly(i * 0.25)} />
        </g>
      ))}
      <text x="18" y="30" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="10" fill="var(--muted)">TRAY 300×100</text>
    </svg>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */
/* 4. One-line: utility → main breaker → panel → circuits → loads                                                */
/* ----------------------------------------------------------------------------------------------------------- */

export function OneLinePower({ className }: { className?: string }) {
  const loads = [
    { y: 34, c: "var(--accent)", t: "LIGHTING" },
    { y: 80, c: "var(--violet)", t: "SOCKETS" },
    { y: 126, c: AMBER, t: "AC" },
  ];
  return (
    <svg viewBox="0 0 320 160" className={cn("block h-auto w-full", className)} role="img" aria-label="One-line diagram of power flowing to three circuits" fill="none" strokeLinecap="round">
      <circle cx="26" cy="80" r="13" stroke="var(--muted)" strokeWidth="1.6" />
      <path d="M19 80 q3.5 -6 7 0 t7 0" stroke="var(--muted)" strokeWidth="1.4" />
      <path d="M39 80 H74" stroke="var(--accent)" strokeWidth="2" className="flow-dash" />
      <rect x="74" y="68" width="24" height="24" rx="4" fill="var(--surface-2)" stroke="var(--border-strong)" />
      <path d="M80 86 L86 74 L92 86" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M98 80 H130" stroke="var(--accent)" strokeWidth="2" className="flow-dash" style={dly(0.2)} />
      <rect x="130" y="22" width="20" height="116" rx="4" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="1.6" />
      {loads.map((l, i) => (
        <g key={l.t}>
          <path d={`M150 ${l.y + 14} H${i === 1 ? 236 : 236}`} stroke={l.c} strokeWidth="2" className="flow-dash" style={dly(0.3 + i * 0.2)} />
          <rect x="236" y={l.y} width="70" height="28" rx="6" fill="var(--surface-2)" stroke={l.c} strokeWidth="1.4" />
          <circle cx="248" cy={l.y + 14} r="3.5" fill={l.c} className="pulse-soft" style={dly(i * 0.4)} />
          <text x="258" y={l.y + 18} fontFamily="var(--font-jetbrains-mono), monospace" fontSize="9.5" fill="var(--fg-soft)">{l.t}</text>
        </g>
      ))}
    </svg>
  );
}
