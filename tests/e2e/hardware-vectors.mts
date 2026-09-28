import { sameHardware } from "../../src/lib/server/hardware.ts";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const h = (t: string, v: string) => createHash("sha256").update(`VLXHW|${t}|${v}`).digest("hex").slice(0, 16);
const pc = (o: Record<string, string | string[] | undefined>) =>
  ["uuid", "board", "cpu", "mg", "vol", "mac"].flatMap((t) => [o[t]].flat().filter(Boolean).map((v) => `${t}:${h(t, v as string)}`)).join(",");
const base = { uuid: "U1", board: "B1", cpu: "C1", mg: "M1", vol: "V1", mac: ["A1", "A2"] };
const named: [string, string, string, boolean][] = [
  ["identical", pc(base), pc(base), true],
  ["windows reinstall (mg+vol change)", pc(base), pc({ ...base, mg: "M2", vol: "V2" }), true],
  ["new network card", pc(base), pc({ ...base, mac: ["A9"] }), true],
  ["cpu upgrade", pc(base), pc({ ...base, cpu: "C2" }), true],
  ["disk replaced + reinstall", pc(base), pc({ ...base, mg: "M2", vol: "V2" }), true],
  ["motherboard replaced", pc(base), pc({ ...base, uuid: "U2", board: "B2", mac: ["A9"] }), false],
  ["other PC", pc(base), pc({ uuid: "U9", board: "B9", cpu: "C9", mg: "M9", vol: "V9", mac: ["A8"] }), false],
  ["VM clone new uuid+mac", pc(base), pc({ ...base, uuid: "U3", mac: ["A7"] }), false],
  ["VM clone new uuid, spoofed mac", pc(base), pc({ ...base, uuid: "U3" }), false],
  ["no SMBIOS both, mac+mg", pc({ mg: "M1", vol: "V1", mac: ["A1"] }), pc({ mg: "M1", vol: "V2", mac: ["A1"] }), true],
  ["no SMBIOS, reinstall", pc({ mg: "M1", vol: "V1", mac: ["A1"] }), pc({ mg: "M2", vol: "V2", mac: ["A1"] }), false],
  ["one side no uuid, mac+board", pc(base), pc({ board: "B1", mac: ["A1"], mg: "M5" }), true],
  ["empty", "", pc(base), false],
  ["garbage", "uuid:zz,mac:123", pc(base), false],
];
const rows: string[] = [];
let bad = 0;
for (const [name, a, b, expect] of named) {
  const got = sameHardware(a, b);
  if (got !== expect) { bad++; console.log("TS scenario FAIL", name, got); }
  rows.push([a, b, got ? 1 : 0].join("\t"));
}
// random fuzz vectors
const types = ["uuid", "board", "cpu", "mg", "vol", "mac"];
for (let i = 0; i < 3000; i++) {
  const mk = () => {
    const o: Record<string, string[]> = {};
    for (const t of types) if (Math.random() < 0.8) o[t] = t === "mac" ? Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => "A" + Math.floor(Math.random() * 4)) : ["X" + Math.floor(Math.random() * 2)];
    return pc(o);
  };
  const a = mk(), b = mk();
  rows.push([a, b, sameHardware(a, b) ? 1 : 0].join("\t"));
}
writeFileSync("vectors.tsv", rows.join("\n") + "\n");
console.log(`scenarios ok: ${named.length - bad}/${named.length}; vectors: ${rows.length}`);
