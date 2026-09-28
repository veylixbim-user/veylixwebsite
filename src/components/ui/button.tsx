import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-on-accent shadow-[0_0_0_1px_rgba(0,229,255,.5),0_8px_30px_-6px_var(--glow),inset_0_1px_0_rgba(255,255,255,.45)] hover:bg-[#5ef0ff] hover:shadow-[0_0_0_1px_rgba(0,229,255,.7),0_10px_40px_-4px_var(--glow),inset_0_1px_0_rgba(255,255,255,.5)]",
        secondary:
          "border border-border-strong bg-surface-2 text-fg hover:border-[color-mix(in_oklab,var(--accent)_45%,var(--border-strong))] hover:bg-surface-3",
        ghost: "border border-border bg-transparent text-fg hover:border-border-strong hover:bg-surface-2",
        subtle: "bg-transparent text-muted hover:bg-surface-2 hover:text-fg",
        link: "h-auto rounded-md p-0 text-accent-fg underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
