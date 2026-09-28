"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav({ items }: { items: { href: string; label: string; icon: React.ReactNode; badge?: number }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-surface-2 text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            {item.icon}
            {item.label}
            {item.badge ? <span className="ms-auto rounded-full bg-accent px-1.5 text-[10px] font-bold text-on-accent">{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
