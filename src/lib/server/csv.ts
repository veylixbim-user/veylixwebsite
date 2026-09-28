import "server-only";

/**
 * One CSV cell. Values that a spreadsheet would treat as a formula (=, +, -, @) are prefixed with an
 * apostrophe, because names and notes come from website visitors (CSV injection).
 */
export function csvCell(v: unknown) {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvResponse(fileName: string, header: string[], rows: unknown[][]) {
  const body = "﻿" + [header.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
