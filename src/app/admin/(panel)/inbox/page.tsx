import type { Metadata } from "next";
import Link from "next/link";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { listMessages } from "@/lib/server/customers";
import { messageAction } from "@/app/admin/actions";
import { CONTACT_EMAIL } from "@/lib/site";
import { AdminHeader } from "@/components/admin/page-header";
import { ComposeEmail } from "@/components/admin/compose-email";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inbox" };

const TOPIC_LABEL: Record<string, string> = { support: "Support", sales: "Sales", billing: "Billing", teams: "Teams", other: "Other" };

export default async function InboxPage({ searchParams }: PageProps<"/admin/inbox">) {
  const sp = await searchParams;
  const filter = sp.show === "handled" ? "handled" : sp.show === "all" ? "all" : "open";
  const messages = await listMessages(filter);

  return (
    <>
      <AdminHeader
        title="Inbox"
        sub={
          <>
            Messages sent from the website’s contact forms. Each one is also forwarded to <span className="font-mono">{CONTACT_EMAIL}</span> — reply here or straight from Gmail.
          </>
        }
      />
      <div className="mb-5 flex gap-2">
        {(["open", "handled", "all"] as const).map((t) => (
          <Link
            key={t}
            href={t === "open" ? "/admin/inbox" : `/admin/inbox?show=${t}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm capitalize",
              filter === t ? "border-[color-mix(in_oklab,var(--accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent-fg" : "border-border text-muted hover:text-fg",
            )}
          >
            {t === "open" ? "To answer" : t}
          </Link>
        ))}
      </div>

      {messages.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong p-10 text-center text-muted">{filter === "open" ? "All caught up — no messages waiting." : "No messages."}</p>
      ) : (
        <ul className="grid gap-4">
          {messages.map((m) => (
            <li key={m.id} className={cn("rounded-2xl border bg-surface p-5", m.handled ? "border-border opacity-80" : "border-[color-mix(in_oklab,var(--accent)_35%,var(--border))]")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{m.name}</span>
                    <span className="font-mono text-sm text-fg-soft">{m.email}</span>
                    <Badge size="sm" variant={m.topic === "support" ? "accent" : "default"}>
                      {TOPIC_LABEL[m.topic] ?? m.topic}
                    </Badge>
                    {m.locale === "ar" ? (
                      <Badge size="sm" variant="mono">
                        AR
                      </Badge>
                    ) : null}
                    {m.handled ? (
                      <Badge size="sm" variant="success">
                        answered
                      </Badge>
                    ) : null}
                  </p>
                  {m.company || m.seats ? (
                    <p className="mt-1 text-xs text-muted">
                      {m.company}
                      {m.company && m.seats ? " · " : ""}
                      {m.seats ? `${m.seats} seats` : ""}
                    </p>
                  ) : null}
                </div>
                <p className="text-xs text-muted">{m.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</p>
              </div>
              {m.body ? (
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-fg-soft" dir="auto">
                  {m.body}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <ComposeEmail
                  to={m.email}
                  name={m.name}
                  messageId={m.id}
                  label="Reply"
                  variant="primary"
                  subject={`Re: your ${TOPIC_LABEL[m.topic]?.toLowerCase() ?? ""} message to VEYLIX`.replace("  ", " ")}
                  body={`Hi ${m.name.split(/\s+/)[0]},\n\n\n\n— VEYLIX\n\n> ${m.body.split("\n").join("\n> ")}`}
                />
                <form action={messageAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="action" value={m.handled ? "reopen" : "done"} />
                  <Button type="submit" size="sm" variant="ghost">
                    {m.handled ? <RotateCcw aria-hidden /> : <Check aria-hidden />}
                    {m.handled ? "Mark as open" : "Mark as answered"}
                  </Button>
                </form>
                <form action={messageAction} className="ms-auto">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="action" value="delete" />
                  <Button type="submit" size="sm" variant="subtle" className="text-danger">
                    <Trash2 aria-hidden /> Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
