"use client";

import * as React from "react";
import { Check, Download, KeyRound, Loader2 } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Asks for a product key and starts the installer download when the server accepts it. */
export function DownloadForm({ product, t, compact = false, initialKey = "" }: { product: string; t: Dictionary["download"]; compact?: boolean; initialKey?: string }) {
  const [key, setKey] = React.useState(initialKey);
  const [state, setState] = React.useState<{ kind: "idle" | "loading" | "ok" | "error"; message?: string }>({ kind: "idle" });
  const id = React.useId();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (key.trim().length < 10) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, product }),
      });
      const data = (await res.json()) as { ok: boolean; url?: string; message?: string };
      if (data.ok && data.url) {
        setState({ kind: "ok", message: t.success });
        window.location.assign(data.url);
      } else {
        setState({ kind: "error", message: data.message ?? t.noFile });
      }
    } catch {
      setState({ kind: "error", message: t.noFile });
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <label htmlFor={`${id}-key`} className={compact ? "sr-only" : "text-sm font-medium text-fg-soft"}>
        {t.keyLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <KeyRound className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            id={`${id}-key`}
            value={key}
            onChange={(e) => {
              setKey(e.target.value.toUpperCase());
              if (state.kind === "error") setState({ kind: "idle" });
            }}
            placeholder={t.keyPlaceholder}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            className="ps-9 font-mono tracking-wide"
            aria-invalid={state.kind === "error"}
            aria-describedby={state.message ? `${id}-msg` : undefined}
          />
        </div>
        <Button type="submit" disabled={state.kind === "loading" || key.trim().length < 10}>
          {state.kind === "loading" ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          {state.kind === "loading" ? t.checking : t.submit}
        </Button>
      </div>
      {state.message ? (
        <p id={`${id}-msg`} role={state.kind === "error" ? "alert" : "status"} className={`flex items-center gap-1.5 text-sm ${state.kind === "error" ? "text-danger" : "text-success"}`}>
          {state.kind === "ok" ? <Check className="size-4" aria-hidden /> : null}
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
