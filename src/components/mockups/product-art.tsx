import type { ArtId } from "@/lib/art";

/**
 * Line-art illustrations for product cards. Pure SVG (renders on the server), animated via CSS when a
 * parent `.group` is hovered or an ancestor carries `.art-play`.
 */
export function ProductArt({ art }: { art: ArtId }) {
  const common = {
    viewBox: "0 0 240 120",
    className: "h-full w-full",
    fill: "none",
    "aria-hidden": true,
  } as const;

  switch (art) {
    case "circuit":
      return (
        <svg {...common}>
          <g stroke="var(--border-strong)" strokeWidth="1">
            {[30, 70, 110, 150].map((x) => (
              <circle key={x} cx={x} cy="34" r="6" />
            ))}
            {[30, 70, 110, 150].map((x) => (
              <circle key={x} cx={x} cy="86" r="6" />
            ))}
          </g>
          <rect x="196" y="40" width="26" height="40" rx="3" stroke="var(--accent)" strokeWidth="1.4" />
          <path className="art-trace" pathLength={1} d="M36 34 H144 L162 52 H196" stroke="var(--accent)" strokeWidth="1.6" />
          <path className="art-trace art-delay" pathLength={1} d="M36 86 H144 L162 68 H196" stroke="var(--violet)" strokeWidth="1.6" />
          <g fill="var(--accent)">
            {[30, 70, 110, 150].map((x) => (
              <circle key={x} cx={x} cy="34" r="2" />
            ))}
          </g>
          <g fill="var(--violet)">
            {[30, 70, 110, 150].map((x) => (
              <circle key={x} cx={x} cy="86" r="2" />
            ))}
          </g>
        </svg>
      );
    case "conduit":
      return (
        <svg {...common}>
          <rect x="80" y="26" width="34" height="34" fill="var(--surface-3)" stroke="var(--border-strong)" />
          <rect x="140" y="64" width="40" height="28" fill="var(--surface-3)" stroke="var(--border-strong)" />
          <path className="art-trace" pathLength={1} d="M14 96 H56 Q66 96 66 86 V20 Q66 12 74 12 H122 Q130 12 130 20 V48 Q130 56 138 56 H196 Q204 56 204 64 V104 H226" stroke="var(--violet)" strokeWidth="5" strokeOpacity=".25" />
          <path className="art-trace" pathLength={1} d="M14 96 H56 Q66 96 66 86 V20 Q66 12 74 12 H122 Q130 12 130 20 V48 Q130 56 138 56 H196 Q204 56 204 64 V104 H226" stroke="var(--violet)" strokeWidth="1.6" />
          <circle cx="14" cy="96" r="3" fill="var(--violet)" />
          <circle cx="226" cy="104" r="3" fill="var(--violet)" />
        </svg>
      );
    case "panel":
      return (
        <svg {...common}>
          <path d="M20 20 V100" stroke="var(--border-strong)" strokeWidth="1.4" />
          {[28, 48, 68, 88].map((y, i) => (
            <g key={y}>
              <path className="art-trace" pathLength={1} d={`M20 ${y} H56`} stroke="var(--accent)" strokeWidth="1.4" style={{ animationDelay: `${i * 80}ms` }} />
              <circle cx="60" cy={y} r="3.5" stroke="var(--accent)" strokeWidth="1.2" />
            </g>
          ))}
          <path d="M92 60 H116" stroke="var(--muted)" strokeWidth="1.2" strokeDasharray="3 3" />
          <path d="M108 54 L116 60 L108 66" stroke="var(--muted)" strokeWidth="1.2" />
          <rect x="126" y="18" width="98" height="84" rx="4" stroke="var(--border-strong)" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x="134" y={27 + i * 14} width="30" height="6" rx="1.5" fill="var(--surface-3)" />
              <rect x="170" y={27 + i * 14} width={i % 2 ? 24 : 40} height="6" rx="1.5" fill={i === 2 ? "var(--accent)" : "var(--surface-3)"} opacity={i === 2 ? 0.7 : 1} />
            </g>
          ))}
        </svg>
      );
    case "lighting":
      return (
        <svg {...common}>
          <defs>
            <radialGradient id="vx-lux" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="var(--success)" stopOpacity=".35" />
              <stop offset="1" stopColor="var(--success)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <g key={`${r}-${c}`} className="art-lux" style={{ animationDelay: `${(r + c) * 120}ms` }}>
                <circle cx={48 + c * 48} cy={24 + r * 36} r="26" fill="url(#vx-lux)" />
                <rect x={42 + c * 48} y={18 + r * 36} width="12" height="12" rx="2" stroke="var(--success)" strokeWidth="1.2" />
              </g>
            )),
          )}
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          {[
            [24, 22, "EL-201"],
            [124, 22, "EL-202"],
            [24, 58, "EL-203"],
            [124, 58, "EL-204"],
            [24, 94, "EL-205"],
            [124, 94, "EL-206"],
          ].map(([x, y, t], i) => (
            <g key={String(t)} className="art-lux" style={{ animationDelay: `${i * 90}ms` }}>
              <circle cx={Number(x) + 6} cy={Number(y) + 1} r="5" stroke="var(--border-strong)" />
              <path d={`M${Number(x) + 11} ${Number(y) + 1} H${Number(x) + 24}`} stroke="var(--violet)" strokeWidth="1" />
              <rect x={Number(x) + 24} y={Number(y) - 7} width="62" height="16" rx="3" stroke="var(--violet)" strokeWidth="1.1" />
              <text x={Number(x) + 30} y={Number(y) + 4.5} fontFamily="var(--font-jetbrains-mono), monospace" fontSize="9" fill="var(--violet-fg)">
                {t}
              </text>
            </g>
          ))}
        </svg>
      );
    case "wiring":
      return (
        <svg {...common}>
          <rect x="14" y="26" width="34" height="68" rx="4" stroke="var(--accent)" strokeWidth="1.4" />
          {[40, 60, 80].map((y) => (
            <path key={y} d={`M22 ${y} H40`} stroke="var(--muted)" strokeWidth="1.2" />
          ))}
          {[
            ["M48 40 H120 L138 22 H190", "var(--accent)"],
            ["M48 60 H190", "var(--violet)"],
            ["M48 80 H120 L138 98 H190", "var(--success)"],
          ].map(([d, c], i) => (
            <path key={i} className="art-trace" pathLength={1} d={d} stroke={c} strokeWidth="1.6" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
          {[22, 60, 98].map((y, i) => (
            <rect key={y} x="190" y={y - 6} width="30" height="12" rx="3" stroke={["var(--accent)", "var(--violet)", "var(--success)"][i]} strokeWidth="1.3" />
          ))}
        </svg>
      );
    case "tray":
      return (
        <svg {...common}>
          <g stroke="var(--border-strong)" strokeWidth="1.6">
            <path d="M12 40 H170 L220 90" />
            <path d="M12 64 H160 L196 100" />
          </g>
          <g stroke="var(--border-strong)" strokeWidth="1">
            {[28, 48, 68, 88, 108, 128, 148].map((x) => (
              <path key={x} d={`M${x} 40 V64`} />
            ))}
          </g>
          {["var(--violet)", "var(--accent)", "var(--success)"].map((c, i) => (
            <path key={c} className="art-trace" pathLength={1} d={`M12 ${46 + i * 7} H${168 - i * 4} L${214 - i * 5} ${92 - i * 1}`} stroke={c} strokeWidth="1.6" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </svg>
      );
    case "plugin":
      return (
        <svg {...common}>
          <rect x="18" y="24" width="204" height="72" rx="8" stroke="var(--border-strong)" />
          <path d="M18 44 H222" stroke="var(--border-strong)" />
          <rect x="120" y="54" width="86" height="32" rx="6" stroke="var(--success)" strokeWidth="1.4" strokeDasharray="3 3" />
          <g className="art-lux">
            <rect x="126" y="58" width="74" height="24" rx="5" fill="color-mix(in oklab, var(--success) 12%, transparent)" stroke="var(--success)" strokeWidth="1.4" />
            <path d="M136 66 L143 76 L150 66" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <path className="art-trace" pathLength={1} d="M30 70 H112" stroke="var(--success)" strokeWidth="1.6" />
        </svg>
      );
    case "bundle":
      return (
        <svg {...common}>
          {[0, 1, 2, 3, 4].map((i) => {
            const cx = 50 + i * 36;
            return (
              <g key={i} className="art-lux" style={{ animationDelay: `${i * 100}ms` }}>
                <path
                  d={`M${cx} ${28} L${cx + 22} ${40} V${80} L${cx} ${92} L${cx - 22} ${80} V${40} Z`}
                  fill="color-mix(in oklab, var(--accent) 6%, transparent)"
                  stroke={i % 2 ? "var(--violet)" : "var(--accent)"}
                  strokeWidth="1.3"
                />
              </g>
            );
          })}
          <path className="art-trace" pathLength={1} d="M28 106 H212" stroke="var(--accent)" strokeWidth="1.4" />
        </svg>
      );
  }
}
