"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

export function CopyInline({ value, className = "" }: { value: string; className?: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3 ${className}`}>
      <code className="ltr select-all font-mono text-[15px] font-semibold tracking-wider">{value}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setDone(true);
            window.setTimeout(() => setDone(false), 1500);
          } catch {
            /* ignore */
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-fg"
        aria-label="Copy"
      >
        {done ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      </button>
    </div>
  );
}
