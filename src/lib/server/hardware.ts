/**
 * Device identity for licenses. The Revit plugin sends a list of hashed hardware signals ("components"),
 * never raw values:
 *
 *   uuid  SMBIOS system UUID        (motherboard; the strongest signal)
 *   board baseboard serial number
 *   cpu   processor id
 *   mg    Windows MachineGuid       (changes when Windows is reinstalled)
 *   vol   system volume serial      (changes when the drive is formatted)
 *   mac   physical network adapter  (one entry per adapter; virtual/VPN/randomised MACs excluded)
 *
 * Each value is SHA-256("VLXHW|type|value"), first 16 hex characters. A MAC address alone is never
 * enough: it can be spoofed, randomised or shared by cloned virtual machines.
 *
 * Two component lists describe the same PC when enough signals survive, so a Windows reinstall, a renamed
 * PC, a new network card or a CPU upgrade keep the license, while a different PC or a cloned VM (new
 * SMBIOS UUID) does not. The C# client (VeylixLicense.cs) implements the identical rule for offline checks
 * — keep both in sync.
 */

export const HW_TYPES = ["uuid", "board", "cpu", "mg", "vol", "mac"] as const;
export type HwType = (typeof HW_TYPES)[number];

const WEIGHTS: Record<HwType, number> = { uuid: 3, mac: 2, board: 2, mg: 2, cpu: 1, vol: 1 };
/** Score needed when both sides have an SMBIOS UUID (which must itself match). */
const THRESHOLD = 6;
/** Score needed when the UUID is unavailable on either side (a physical MAC must match). */
const FALLBACK_THRESHOLD = 4;
const MAX_ENTRIES = 16;
const ENTRY_RE = /^(uuid|board|cpu|mg|vol|mac):[0-9a-f]{16}$/;

export type Components = Map<HwType, Set<string>>;

/** Parses and normalises "type:hash,type:hash". Invalid input yields an empty map (exact-ID matching only). */
export function parseComponents(raw: string | null | undefined): Components {
  const out: Components = new Map();
  if (!raw) return out;
  const entries = raw.toLowerCase().split(",").slice(0, MAX_ENTRIES);
  for (const e of entries) {
    const entry = e.trim();
    if (!ENTRY_RE.test(entry)) continue;
    const [type, hash] = entry.split(":") as [HwType, string];
    if (type !== "mac" && out.has(type)) continue; // one value per non-MAC signal
    const set = out.get(type) ?? new Set<string>();
    if (type === "mac" && set.size >= 8) continue;
    set.add(hash);
    out.set(type, set);
  }
  return out;
}

/** Canonical string form (sorted), stored in the database and signed into the license. */
export function formatComponents(c: Components): string {
  const parts: string[] = [];
  for (const type of HW_TYPES) for (const hash of [...(c.get(type) ?? [])].sort()) parts.push(`${type}:${hash}`);
  return parts.join(",");
}

export function isValidComponents(raw: string | null | undefined) {
  return parseComponents(raw).size > 0;
}

export function matchScore(a: Components, b: Components) {
  let score = 0;
  const matched = new Set<HwType>();
  for (const type of HW_TYPES) {
    const x = a.get(type);
    const y = b.get(type);
    if (!x || !y) continue;
    if ([...x].some((h) => y.has(h))) {
      score += WEIGHTS[type];
      matched.add(type);
    }
  }
  return { score, matched };
}

/** True when two component lists describe the same physical PC (see the rules at the top of this file). */
export function sameHardware(aRaw: string | null | undefined, bRaw: string | null | undefined): boolean {
  const a = parseComponents(aRaw);
  const b = parseComponents(bRaw);
  if (a.size === 0 || b.size === 0) return false;
  const { score, matched } = matchScore(a, b);
  if (a.has("uuid") && b.has("uuid")) return matched.has("uuid") && score >= THRESHOLD;
  return matched.has("mac") && score >= FALLBACK_THRESHOLD;
}

/** SQL LIKE patterns that pre-select rows that could match (strong signals only); exact check happens in JS. */
export function candidatePatterns(raw: string | null | undefined): string[] {
  const c = parseComponents(raw);
  const out: string[] = [];
  for (const h of c.get("uuid") ?? []) out.push(`%uuid:${h}%`);
  for (const h of c.get("mac") ?? []) out.push(`%mac:${h}%`);
  return out;
}
