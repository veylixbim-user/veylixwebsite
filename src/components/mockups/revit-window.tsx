"use client";

import type { CSSProperties } from "react";
import { Boxes, Cable, ClipboardCheck, GitBranch, Lightbulb, PanelsTopLeft, Route, Scale, Tags, Zap } from "lucide-react";
import { FloorPlan } from "./floor-plan";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const TABS = ["File", "Architecture", "Systems", "Insert", "Annotate", "Analyze", "View", "Manage"];

const GROUPS = [
  { label: "Wiring", tools: [{ icon: Zap, name: "Wire", active: true }, { icon: Scale, name: "Balance" }] },
  { label: "Routing", tools: [{ icon: Route, name: "Route" }, { icon: Cable, name: "Tray" }] },
  { label: "Schedules", tools: [{ icon: PanelsTopLeft, name: "Panels" }, { icon: GitBranch, name: "One-line" }] },
  { label: "Lighting", tools: [{ icon: Lightbulb, name: "Layout" }] },
  { label: "QA / QC", tools: [{ icon: Tags, name: "Tag" }, { icon: ClipboardCheck, name: "Audit" }] },
  { label: "License", tools: [{ icon: Boxes, name: "Status" }] },
];

const SCHEDULE = [
  ["1", "Recept. — Office N", "1,620", "L1"],
  ["2", "Recept. — North wall", "1,500", "L2"],
  ["3", "Lighting — Office S", "960", "L3"],
  ["4", "Lighting — Office N", "1,280", "L1"],
  ["5", "Lighting — MTG 2.01–03", "540", "L2"],
  ["6", "Pantry — dedicated", "2,200", "L3"],
];

const PHASE = { L1: "bg-accent", L2: "bg-[#9b87ff]", L3: "bg-success" } as const;

export function RevitWindow({
  file,
  status,
  schedule,
  connected,
  demand,
  className,
}: {
  file: string;
  status: string;
  schedule: string;
  connected: string;
  demand: string;
  className?: string;
}) {
  return (
    <div
      dir="ltr"
      className={cn(
        "overflow-hidden rounded-2xl border border-[#243042] bg-[#0c1017] text-[#c9d4e3] shadow-[0_40px_120px_-30px_rgba(0,229,255,0.25),0_30px_80px_-20px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex h-9 items-center gap-3 border-b border-[#1c2533] bg-[#0f141d] px-3.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="size-2.5 rounded-full bg-[#28c840]/80" />
        </div>
        <p className="min-w-0 flex-1 truncate text-center font-mono text-[10.5px] text-[#7d8da3]">{file}</p>
        <span className="hidden font-mono text-[10px] text-[#7d8da3] sm:inline">Revit 2025</span>
      </div>

      {/* Ribbon tabs */}
      <div className="flex h-8 items-end gap-0.5 overflow-hidden border-b border-[#1c2533] bg-[#0f141d] px-2 text-[11px]">
        {TABS.map((t, i) => (
          <span key={t} className={cn("px-2.5 pb-1.5 text-[#8b9bb1]", i > 4 && "hidden md:inline")}>
            {t}
          </span>
        ))}
        <span className="relative flex items-center gap-1.5 rounded-t-md border border-b-0 border-[#1f3a4a] bg-[#101c26] px-2.5 pb-1.5 pt-1 font-semibold text-accent">
          <LogoMark className="size-3.5" glow={false} />
          VEYLIX
          <span className="absolute inset-x-2 -bottom-px h-px bg-accent shadow-[0_0_8px_var(--accent)]" />
        </span>
      </div>

      {/* Ribbon panel */}
      <div className="flex h-[74px] items-stretch gap-0 overflow-hidden border-b border-[#1c2533] bg-[#101722] px-1.5">
        {GROUPS.map((g, gi) => (
          <div key={g.label} className={cn("flex flex-col border-e border-[#1c2533] px-1.5 last:border-e-0", gi > 3 && "hidden sm:flex", gi > 4 && "hidden lg:flex")}>
            <div className="flex flex-1 items-center gap-1">
              {g.tools.map(({ icon: Icon, name, active }) => (
                <span
                  key={name}
                  className={cn(
                    "flex w-[52px] flex-col items-center gap-1 rounded-md py-1 text-[10px]",
                    active ? "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent ring-1 ring-[color-mix(in_oklab,var(--accent)_40%,transparent)]" : "text-[#9aabc2]",
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden />
                  {name}
                </span>
              ))}
            </div>
            <span className="pb-1 text-center text-[9px] uppercase tracking-wider text-[#7d8da3]">{g.label}</span>
          </div>
        ))}
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_236px]">
        <div className="relative overflow-hidden border-[#1c2533] md:border-e">
          <FloorPlan variant="after" animate />
          {/* scan line */}
          <div
            aria-hidden
            className="scanline pointer-events-none absolute"
          />
          <div className="absolute bottom-3 start-3 flex items-center gap-2 rounded-md border border-[#1f3a4a] bg-[#0a121c]/90 px-2 py-1 font-mono text-[10px] text-[#9aabc2]">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-success" />
            1:100 · Power Plan
          </div>
        </div>

        {/* Schedule panel */}
        <div className="hidden flex-col bg-[#0e141d] md:flex">
          <div className="flex items-center justify-between border-b border-[#1c2533] px-3 py-2">
            <span className="text-[11px] font-semibold text-[#dfe7f2]">{schedule}</span>
            <span className="rounded bg-[color-mix(in_oklab,var(--success)_15%,transparent)] px-1.5 py-px font-mono text-[9px] text-success">SYNC</span>
          </div>
          <div className="grid grid-cols-[18px_1fr_42px_18px] gap-x-2 border-b border-[#1c2533] px-3 py-1.5 font-mono text-[9px] uppercase text-[#7d8da3]">
            <span>#</span>
            <span>Desc.</span>
            <span className="text-end">VA</span>
            <span>Ph</span>
          </div>
          <ul className="flex-1">
            {SCHEDULE.map((row, i) => (
              <li
                key={row[0]}
                className="appear grid grid-cols-[18px_1fr_42px_18px] items-center gap-x-2 border-b border-[#161e2a] px-3 py-[7px] font-mono text-[10px]"
                style={{ "--delay": `${1.2 + i * 0.28}s` } as CSSProperties}
              >
                <span className="text-[#7d8da3]">{row[0]}</span>
                <span className="truncate text-[#c9d4e3]">{row[1]}</span>
                <span className="text-end tabular-nums text-[#dfe7f2]">{row[2]}</span>
                <span className="flex items-center gap-1 text-[#7d8da3]">
                  <span className={cn("size-1.5 rounded-full", PHASE[row[3] as keyof typeof PHASE])} />
                </span>
              </li>
            ))}
          </ul>
          <div className="appear space-y-2 border-t border-[#1c2533] px-3 py-3" style={{ "--delay": "3s" } as CSSProperties}>
            <Meter label={connected} value="38.4 kVA" pct={78} />
            <Meter label={demand} value="29.1 kVA" pct={59} />
            <div className="flex gap-1 pt-1" aria-hidden>
              {(["L1", "L2", "L3"] as const).map((p, i) => (
                <span key={p} className="flex flex-1 items-center justify-between rounded border border-[#1c2533] px-1.5 py-1 font-mono text-[9px] text-[#7d8da3]">
                  {p}
                  <span className="text-[#dfe7f2]">{["12.9", "12.6", "12.9"][i]}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-7 items-center gap-2 border-t border-[#1c2533] bg-[#0f141d] px-3 font-mono text-[10px] text-[#7d8da3]">
        <span className="size-1.5 rounded-full bg-success" />
        <span className="truncate">{status}</span>
      </div>
    </div>
  );
}

function Meter({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-[9.5px]">
        <span className="text-[#7d8da3]">{label}</span>
        <span className="text-[#dfe7f2]">{value}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#1a2330]">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#9b87ff]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
