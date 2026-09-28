"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ArtId } from "@/lib/art";
import { LogoMark } from "@/components/brand/logo";
import { ProductArt } from "@/components/mockups/product-art";

export function ProductGallery({ images, art, name }: { images: { url: string }[]; art?: ArtId | null; name: string }) {
  const [active, setActive] = React.useState(0);
  if (images.length === 0) {
    return (
      <div className="group art-play bg-blueprint grid aspect-[16/10] place-items-center rounded-2xl border border-border bg-bg-elevated p-8 sm:p-12">
        {art ? <ProductArt art={art} /> : <LogoMark className="size-24" />}
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-[var(--shadow-lg)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active].url} alt={`${name} — ${active + 1}`} className="aspect-[16/10] w-full object-contain" />
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${name} ${i + 1}`}
              aria-pressed={i === active}
              className={cn("shrink-0 overflow-hidden rounded-lg border-2 transition-colors", i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" loading="lazy" className="h-16 w-24 object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
