import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-surface-2 text-fg-soft",
        accent: "border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent-fg",
        violet: "border-[color-mix(in_oklab,var(--violet)_40%,transparent)] bg-[color-mix(in_oklab,var(--violet)_12%,transparent)] text-violet-fg",
        success: "border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] text-success",
        mono: "rounded-md border-border bg-surface-2 font-mono text-muted",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
