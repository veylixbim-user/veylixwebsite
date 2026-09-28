import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Database } from "lucide-react";
import { isDatabaseConfigured } from "@/lib/server/db";
import { isAdmin } from "@/lib/server/auth";
import { LogoMark } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = isDatabaseConfigured();
  if (configured && (await isAdmin())) redirect("/admin");

  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-16">
      <div aria-hidden className="bg-blueprint pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000,transparent)]" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <LogoMark className="size-14" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">VEYLIX Admin</h1>
            <p className="mt-1 text-sm text-muted">Products, license keys and orders.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-lg)]">
          {configured ? (
            <LoginForm />
          ) : (
            <div className="grid gap-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-warning">
                <Database className="size-4" aria-hidden /> Database not connected
              </p>
              <p className="text-muted">
                In Vercel, open your project → <b>Storage</b> → <b>Create Database</b> → <b>Neon (Postgres)</b> and connect it to this
                project. Then add <b>Blob</b> storage the same way, and redeploy.
              </p>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            ← Back to the website
          </Link>
        </p>
      </div>
    </main>
  );
}
