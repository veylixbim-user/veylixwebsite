import { recentSecurityEvents } from "@/lib/server/security-log";
import { AdminHeader, Card } from "@/components/admin/page-header";

export const metadata = { title: "Security" };

const LABEL: Record<string, string> = {
  admin_login: "Admin signed in",
  admin_login_failed: "Failed admin sign-in",
  admin_lockout: "Sign-in while locked out",
  payment_hmac_failed: "Payment callback with a wrong signature",
  payment_amount_mismatch: "Payment of the wrong amount",
  payment_unknown_order: "Payment for an unknown order",
  payment_duplicate: "Second payment on a paid order",
  payment_refunded: "Refund / void reported",
  bot_blocked: "Bot blocked",
  origin_blocked: "Cross-site request blocked",
};

/** The last 200 security-relevant events, so odd behaviour is visible without digging through server logs. */
export default async function SecurityPage() {
  const events = await recentSecurityEvents(200);
  return (
    <>
      <AdminHeader title="Security" sub="Sign-ins, lockouts, blocked bots and cross-site requests, and anything suspicious about payments. Kept for 90 days. Every admin sign-in is also emailed to you." />
      <Card className="overflow-x-auto p-0 sm:p-0">
        {events.length === 0 ? (
          <p className="p-10 text-center text-muted">Nothing to report yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-4 py-3 text-start font-medium">When (UTC)</th>
                <th className="px-4 py-3 text-start font-medium">Event</th>
                <th className="px-4 py-3 text-start font-medium">Detail</th>
                <th className="px-4 py-3 text-start font-medium">Address</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{e.createdAt.slice(0, 19).replace("T", " ")}</td>
                  <td className="px-4 py-2.5">{LABEL[e.kind] ?? e.kind}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{e.detail}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{e.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
