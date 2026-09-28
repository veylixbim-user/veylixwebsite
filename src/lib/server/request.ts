import "server-only";

/** Reads a small JSON or form-encoded body (the Revit plugin posts form fields). */
export async function readFields(request: Request, maxBytes = 8192): Promise<Record<string, string> | null> {
  const type = request.headers.get("content-type") ?? "";
  const text = await request.text().catch(() => "");
  if (text.length > maxBytes) return null;
  try {
    if (type.includes("application/json")) {
      const data = JSON.parse(text) as unknown;
      if (!data || typeof data !== "object" || Array.isArray(data)) return null;
      return Object.fromEntries(Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, typeof v === "string" ? v : v == null ? "" : String(v)]));
    }
    return Object.fromEntries(new URLSearchParams(text));
  } catch {
    return null;
  }
}
