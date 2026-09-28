"use client";

import * as React from "react";
import { useInView } from "motion/react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Line = { kind: string; text: string };

/** Command palette session that types itself out once scrolled into view. */
export function Terminal({ title, lines }: { title: string; lines: Line[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const [shown, setShown] = React.useState(0);
  const [typed, setTyped] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const timers: number[] = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timers.push(
        window.setTimeout(() => {
          setShown(lines.length);
          setTyped(Number.MAX_SAFE_INTEGER);
        }, 0),
      );
      return () => timers.forEach(clearTimeout);
    }
    let t = 300;
    lines.forEach((line, i) => {
      if (line.kind === "cmd") {
        timers.push(window.setTimeout(() => !cancelled && (setShown(i + 1), setTyped(0)), t));
        for (let c = 1; c <= line.text.length; c++) {
          timers.push(window.setTimeout(() => !cancelled && setTyped(c), t + c * 22));
        }
        t += line.text.length * 22 + 380;
      } else {
        timers.push(window.setTimeout(() => !cancelled && (setShown(i + 1), setTyped(Number.MAX_SAFE_INTEGER)), t));
        t += line.kind === "done" ? 200 : 260;
      }
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [inView, lines]);

  return (
    <div ref={ref} dir="ltr" className="overflow-hidden rounded-2xl border border-[#243042] bg-[#0a0e14] shadow-[var(--shadow-lg)]">
      <div className="flex h-9 items-center gap-3 border-b border-[#1c2533] bg-[#0f141d] px-3.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="size-2.5 rounded-full bg-[#28c840]/80" />
        </div>
        <p className="flex-1 truncate text-center font-mono text-[10.5px] text-[#7d8da3]">{title}</p>
        <span className="rounded border border-[#243042] px-1.5 font-mono text-[9px] text-[#7d8da3]">Ctrl+Shift+V</span>
      </div>
      <div className="min-h-[300px] p-4 font-mono text-[12px] leading-6 sm:p-5 sm:text-[12.5px]" aria-live="off">
        {/* Accessible full transcript for screen readers */}
        <ol className="sr-only">
          {lines.map((l, i) => (
            <li key={i}>{l.text}</li>
          ))}
        </ol>
        <div aria-hidden>
          {lines.slice(0, shown).map((line, i) => {
            const isLast = i === shown - 1;
            if (line.kind === "cmd") {
              const text = isLast ? line.text.slice(0, typed) : line.text;
              return (
                <div key={i} className={cn("flex gap-2 text-[#e6edf6]", i > 0 && "mt-3")}>
                  <ChevronRight className="mt-[5px] size-3.5 shrink-0 text-accent" />
                  <span className={cn("break-all", isLast && typed < line.text.length && "caret")}>{text}</span>
                </div>
              );
            }
            if (line.kind === "done") {
              return (
                <div key={i} className="mt-3 flex items-center gap-2 text-success">
                  <span className="rounded bg-[color-mix(in_oklab,var(--success)_15%,transparent)] px-1.5 text-[10px] font-semibold">DONE</span>
                  <span className="caret">{line.text}</span>
                </div>
              );
            }
            return (
              <div key={i} className="flex gap-2 ps-5 text-[#8fa1b8]">
                <Check className="mt-[5px] size-3.5 shrink-0 text-success" />
                <span>{line.text}</span>
              </div>
            );
          })}
          {shown === 0 ? (
            <div className="flex gap-2 text-[#e6edf6]">
              <ChevronRight className="mt-[5px] size-3.5 shrink-0 text-accent" />
              <span className="caret" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
