import { isAdmin } from "@/lib/server/auth";
import { csvResponse } from "@/lib/server/csv";
import { exportKeys, type KeyFilter } from "@/lib/server/license-keys";

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const filter: KeyFilter = {
    q: url.searchParams.get("q") ?? undefined,
    status: (url.searchParams.get("status") as KeyFilter["status"]) ?? "all",
    productId: url.searchParams.get("product") ?? "all",
    type: (url.searchParams.get("type") as KeyFilter["type"]) ?? "all",
  };
  const keys = await exportKeys(filter);
  return csvResponse(
    `veylix-keys-${new Date().toISOString().slice(0, 10)}.csv`,
    ["key", "status", "type", "product", "assigned_to", "note", "order_id", "device_name", "activated_at", "last_check_at", "expires_at", "check_days_override", "downloads", "created_at"],
    keys.map((k) => [k.key, k.status, k.trial ? "trial" : "paid", k.productName ?? "All products", k.assignedTo, k.note, k.orderId, k.deviceName, k.activatedAt, k.lastCheckAt, k.expiresAt, k.activationDays, k.downloads, k.createdAt]),
  );
}
