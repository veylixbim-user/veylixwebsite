"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { CalendarClock, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export function DemoDialog({
  label,
  title,
  body,
  cta,
  ctaHref,
  closeLabel,
}: {
  label: string;
  title: string;
  body: string;
  cta: string;
  ctaHref: string;
  closeLabel: string;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="lg" className="w-full sm:w-auto">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-fg text-bg">
            <Play className="!size-2.5 translate-x-px fill-current" aria-hidden />
          </span>
          {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="pop fixed inset-x-0 top-[10vh] z-[81] mx-auto w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated shadow-[var(--shadow-lg)]">
          <div className="relative aspect-video overflow-hidden bg-[#0b1017]">
            <div className="bg-blueprint absolute inset-0 opacity-60" aria-hidden />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <LogoMark className="size-20" animated />
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-[#7d8da3]">90s · VEYLIX</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-lg">
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-muted">{body}</Dialog.Description>
            </div>
            <Button asChild>
              <Link href={ctaHref}>
                <CalendarClock aria-hidden />
                {cta}
              </Link>
            </Button>
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label={closeLabel}
              className="absolute end-3 top-3 inline-flex size-9 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur hover:bg-black/60"
            >
              <X className="size-5" aria-hidden />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
