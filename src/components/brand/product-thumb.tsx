import type { ArtId } from "@/lib/art";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import { ProductIcon } from "./product-icon";

/** Product thumbnail: the chosen VEYLIX artwork icon, else the cover image, else the logo mark. */
export function ProductThumb({ image, art, name, className }: { image: string | null | undefined; art?: ArtId | null; name: string; className?: string }) {
  if (art) {
    return (
      <span className="relative inline-flex">
        <ProductIcon art={art} className={className} />
        <span className="sr-only">{name}</span>
      </span>
    );
  }
  return (
    <span className={cn("relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-elevated", className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <LogoMark className="size-3/5" glow={false} />
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
