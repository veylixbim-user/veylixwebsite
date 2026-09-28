import { isAdmin } from "@/lib/server/auth";
import { csvResponse } from "@/lib/server/csv";
import { listCustomers } from "@/lib/server/customers";

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const customers = await listCustomers(url.searchParams.get("q") ?? undefined, url.searchParams.get("source") ?? undefined);
  return csvResponse(
    `veylix-customers-${new Date().toISOString().slice(0, 10)}.csv`,
    ["email", "name", "phone", "sources", "orders", "paid_orders", "trials", "messages", "first_seen", "last_seen", "last_emailed_at"],
    customers.map((c) => [c.email, c.name, c.phone, c.sources.join(" "), c.orders, c.paidOrders, c.trials, c.messages, c.firstSeen, c.lastSeen, c.lastEmailedAt]),
  );
}
