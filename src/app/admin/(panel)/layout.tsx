import Link from "next/link";
import { ExternalLink, Inbox, KeyRound, LayoutDashboard, LogOut, Package, Palette, Receipt, Settings, Users } from "lucide-react";
import { requireAdmin } from "@/lib/server/auth";
import { ensureSeedKeys } from "@/lib/server/license-keys";
import { pendingOrderCount } from "@/lib/server/orders";
import { openMessageCount } from "@/lib/server/customers";
import { logoutAction } from "@/app/admin/actions";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  await ensureSeedKeys();
  const [pending, unread] = await Promise.all([pendingOrderCount(), openMessageCount()]);

  const items = [
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="size-4" aria-hidden /> },
    { href: "/admin/products", label: "Products", icon: <Package className="size-4" aria-hidden /> },
    { href: "/admin/keys", label: "License keys", icon: <KeyRound className="size-4" aria-hidden /> },
    { href: "/admin/orders", label: "Orders", icon: <Receipt className="size-4" aria-hidden />, badge: pending || undefined },
    { href: "/admin/inbox", label: "Inbox", icon: <Inbox className="size-4" aria-hidden />, badge: unread || undefined },
    { href: "/admin/customers", label: "Customers", icon: <Users className="size-4" aria-hidden /> },
    { href: "/admin/library", label: "Design library", icon: <Palette className="size-4" aria-hidden /> },
    { href: "/admin/settings", label: "Settings", icon: <Settings className="size-4" aria-hidden /> },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-bg-elevated lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-e">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/admin" className="rounded-lg">
            <Logo />
          </Link>
          <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">Admin</span>
        </div>
        <AdminNav items={items} />
        <div className="hidden border-t border-border p-3 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <Link href="/en" target="_blank" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
            <ExternalLink className="size-4" aria-hidden /> View website
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}
