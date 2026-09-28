import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { listCustomers, recentEmails } from "@/lib/server/customers";
import { mailProvider } from "@/lib/server/mail";
import { AdminHeader, Card } from "@/components/admin/page-header";
import { ComposeEmail } from "@/components/admin/compose-email";
import { CopyButton } from "@/components/admin/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

const SOURCES = [
  { id: "all", label: "Everyone" },
  { id: "order", label: "Buyers" },
  { id: "trial", label: "Trial users" },
  { id: "newsletter", label: "Newsletter" },
  { id: "message", label: "Wrote in" },
] as const;

const SOURCE_BADGE: Record<string, string> = { order: "buyer", trial: "trial", newsletter: "newsletter", message: "message" };

const date = (d: Date) => d.toISOString().slice(0, 10);

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const source = typeof sp.source === "string" ? sp.source : "all";
  const [customers, emails] = await Promise.all([listCustomers(q, source), recentEmails(12)]);
  const provider = mailProvider();
  const qs = new URLSearchParams({ ...(q ? { q } : {}), ...(source !== "all" ? { source } : {}) }).toString();

  return (
    <>
      <AdminHeader
        title="Customers"
        sub="Everyone who gave their email on the website — buyers, trial users, newsletter sign-ups and people who wrote in. Email them for help, follow-ups and announcements from veylixbim@gmail.com."
        actions={
          <Button asChild variant="secondary" size="sm">
            <a href={`/api/admin/customers/export${qs ? `?${qs}` : ""}`}>
              <Download aria-hidden /> Export CSV
            </a>
          </Button>
        }
      />

      {!provider ? (
        <Card className="mb-6 border-[color-mix(in_oklab,var(--warning)_40%,var(--border))]">
          <p className="font-medium">Sending from Gmail is not switched on yet</p>
          <p className="mt-1 text-sm text-muted">
            Add a Gmail App Password for veylixbim@gmail.com as <span className="font-mono">GMAIL_APP_PASSWORD</span> in Vercel → Settings → Environment Variables (steps in{" "}
            <Link href="/admin/settings#email" className="text-accent-fg hover:underline">
              Settings
            </Link>
            ). Until then the Email button offers to open the message in Gmail.
          </p>
        </Card>
      ) : null}

      <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Search name or email…" aria-label="Search customers" className="ps-9" />
        </div>
        {source !== "all" ? <input type="hidden" name="source" value={source} /> : null}
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <div className="mb-5 flex flex-wrap gap-2">
        {SOURCES.map((s) => (
          <Link
            key={s.id}
            href={`/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), ...(s.id !== "all" ? { source: s.id } : {}) }).toString()}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              source === s.id ? "border-[color-mix(in_oklab,var(--accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent-fg" : "border-border text-muted hover:text-fg",
            )}
          >
            {s.label}
          </Link>
        ))}
        {customers.length ? (
          <span className="ms-auto inline-flex items-center gap-1 text-xs text-muted">
            {customers.length} {customers.length === 1 ? "person" : "people"} · copy all addresses (for BCC)
            <CopyButton value={customers.map((c) => c.email).join(", ")} />
          </span>
        ) : null}
      </div>

      {customers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong p-10 text-center text-muted">No customers yet. They appear here as soon as someone buys, starts a trial, subscribes or sends a message.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted">
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  Activity
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  Last seen
                </th>
                <th scope="col" className="px-4 py-3 text-end font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      <bdi>{c.name ?? "—"}</bdi>
                    </p>
                    <p className="flex items-center gap-1 font-mono text-xs text-fg-soft">
                      {c.email}
                      <CopyButton value={c.email} />
                    </p>
                    {c.phone ? <p className="font-mono text-xs text-muted">{c.phone}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.sources.map((s) => (
                        <Badge key={s} size="sm" variant={s === "order" ? "success" : s === "trial" ? "accent" : "default"}>
                          {SOURCE_BADGE[s] ?? s}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {[c.orders ? `${c.paidOrders}/${c.orders} orders paid` : null, c.trials ? `${c.trials} trial${c.trials > 1 ? "s" : ""}` : null, c.messages ? `${c.messages} message${c.messages > 1 ? "s" : ""}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    <p>{date(c.lastSeen)}</p>
                    {c.lastEmailedAt ? <p>emailed {date(c.lastEmailedAt)}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <ComposeEmail to={c.email} name={c.name} subject="VEYLIX" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {emails.length ? (
        <Card className="mt-8">
          <h2 className="font-semibold">Recently sent</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {emails.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="font-mono text-xs text-fg-soft">{e.to_email}</span> <span className="text-fg">{e.subject}</span>
                  {e.error ? <span className="block text-xs text-danger">{e.error}</span> : null}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <Badge size="sm" variant={e.status === "sent" ? "success" : "default"}>
                    {e.status === "not_configured" ? "not sent" : e.status}
                  </Badge>
                  {e.kind} · {new Date(e.created_at).toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
