"use client";

import { cn } from "@/lib/utils";

const PHASE_COLOR: Record<string, string> = { L1: "var(--accent)", L2: "#9b87ff", L3: "var(--success)" };

/** One-line diagram synced with a panel schedule. Engineering UI stays LTR in both locales. */
export function PanelSchedule({
  panelName,
  specs,
  columns,
  rows,
  total,
  synced,
}: {
  panelName: string;
  specs: string[];
  columns: string[];
  rows: string[][];
  total: string;
  synced: string;
}) {
  return (
    <div dir="ltr" className="overflow-hidden rounded-2xl border border-[#243042] bg-[#0b1017] text-[#c9d4e3] shadow-[var(--shadow-lg)]">
      <div className="flex items-center justify-between border-b border-[#1c2533] bg-[#0f141d] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-semibold text-[#e6edf6]">{panelName}</span>
          <span className="hidden gap-1.5 sm:flex">
            {specs.map((s) => (
              <span key={s} className="rounded border border-[#243042] px-1.5 py-px font-mono text-[9.5px] text-[#7d8da3]">
                {s}
              </span>
            ))}
          </span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--success)_35%,transparent)] px-2 py-0.5 font-mono text-[10px] text-success">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-success" />
          {synced}
        </span>
      </div>

      <div className="grid md:grid-cols-[200px_1fr]">
        {/* One-line */}
        <div className="border-b border-[#1c2533] p-4 md:border-b-0 md:border-e">
          <svg viewBox="0 0 170 250" className="mx-auto h-auto w-full max-w-[200px]" aria-hidden>
            <g fill="none" stroke="#7d8da3" strokeWidth="1.4">
              <path d="M85 8 V36" />
              <rect x="70" y="36" width="30" height="20" rx="2" stroke="var(--accent)" />
              <path d="M85 56 V78 M20 78 H150" strokeWidth="2.2" stroke="#c9d4e3" />
              {rows.map((r, i) => {
                const x = 20 + i * 26;
                return (
                  <g key={r[0]}>
                    <path d={`M${x} 78 V100`} />
                    <path d={`M${x - 5} 100 L${x + 5} 112`} stroke={PHASE_COLOR[r[4]]} strokeWidth="1.8" />
                    <path d={`M${x} 112 V150`} />
                    <path d={`M${x} 150 V${176 + (i % 2) * 16}`} stroke={PHASE_COLOR[r[4]]} strokeDasharray="2 3" />
                    <circle cx={x} cy={184 + (i % 2) * 16} r="5" stroke={PHASE_COLOR[r[4]]} />
                  </g>
                );
              })}
            </g>
            <g fontFamily="var(--font-jetbrains-mono), monospace" fontSize="8" fill="#7d8da3">
              <text x="106" y="50">125A</text>
              <text x="92" y="18">MDB-01</text>
              {rows.map((r, i) => (
                <text key={r[0]} x={17 + i * 26} y={128} fill="#dfe7f2" fontSize="7.5">
                  {r[0]}
                </text>
              ))}
              <text x="20" y="232" fontSize="7.5">
                {panelName} · 3Φ
              </text>
            </g>
          </svg>
        </div>

        {/* Schedule */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b border-[#1c2533] text-[9.5px] uppercase tracking-wider text-[#7d8da3]">
                {columns.map((c, i) => (
                  <th key={c} scope="col" className={cn("px-3 py-2 font-medium", i === 2 && "text-right")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r[0]} className={cn("border-b border-[#161e2a]", i === 4 && "bg-[color-mix(in_oklab,var(--accent)_7%,transparent)]")}>
                  <td className="px-3 py-2.5 text-[#7d8da3]">{r[0]}</td>
                  <td className="px-3 py-2.5 text-[#dfe7f2]">{r[1]}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#dfe7f2]">{r[2]}</td>
                  <td className="px-3 py-2.5">{r[3]}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ background: PHASE_COLOR[r[4]] }} />
                      {r[4]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-3 font-mono text-[10.5px] text-[#9aabc2]">{total}</p>
        </div>
      </div>
    </div>
  );
}
