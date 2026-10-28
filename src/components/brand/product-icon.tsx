import { Boxes, Cable, Lightbulb, PanelsTopLeft, PlugZap, Rows3, Route, Tags, Zap, type LucideIcon } from "lucide-react";
import { ART, type ArtId } from "@/lib/art";
import { cn } from "@/lib/utils";

export const productIcons: Record<ArtId, LucideIcon> = {
  circuit: Zap,
  conduit: Route,
  panel: PanelsTopLeft,
  lighting: Lightbulb,
  tag: Tags,
  bundle: Boxes,
  wiring: Cable,
  tray: Rows3,
  plugin: PlugZap,
};

const accentClass = {
  cyan: "text-accent-fg border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_9%,var(--surface))]",
  violet: "text-violet-fg border-[color-mix(in_oklab,var(--violet)_40%,var(--border))] bg-[color-mix(in_oklab,var(--violet)_10%,var(--surface))]",
  mint: "text-success border-[color-mix(in_oklab,var(--success)_35%,var(--border))] bg-[color-mix(in_oklab,var(--success)_9%,var(--surface))]",
} as const;

export function ProductIcon({
  art,
  accent = ART[art].accent,
  className,
  size = "md",
}: {
  art: ArtId;
  accent?: keyof typeof accentClass;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = productIcons[art];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,.06)]",
        size === "sm" && "size-8 [&_svg]:size-4",
        size === "md" && "size-11 [&_svg]:size-5",
        size === "lg" && "size-14 rounded-2xl [&_svg]:size-6",
        accentClass[accent],
        className,
      )}
    >
      <Icon aria-hidden strokeWidth={1.75} />
    </span>
  );
}
