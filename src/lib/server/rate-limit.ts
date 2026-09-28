import "server-only";
import { query } from "./db";

/**
 * Fixed-window rate limiter backed by Postgres, so it holds across serverless instances.
 * Returns true when the request is allowed.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number) {
  try {
    const rows = await query<{ count: number }>(
      `INSERT INTO rate_limits (bucket, count, window_start) VALUES ($1, 1, now())
       ON CONFLICT (bucket) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN now() ELSE rate_limits.window_start END
       RETURNING count`,
      [bucket.slice(0, 200), windowSeconds],
    );
    return (rows[0]?.count ?? 0) <= limit;
  } catch (err) {
    console.error("[rate-limit]", err);
    return true; // fail open: never lock customers out because of a limiter error
  }
}

export function ipFrom(request: Request) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim().slice(0, 64);
}
