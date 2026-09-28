/** Sample content for the animated mockups (the text from the original homepage). Edit freely. */

export const TERMINAL_SAMPLE = {
  title: "VEYLIX Command Palette — Revit 2025",
  lines: [
    { kind: "cmd", text: 'veylix circuit --scope "Level 02" --panel LP-2A --code ECP-306-1' },
    { kind: "ok", text: "Scanned 148 electrical fixtures across 31 rooms" },
    { kind: "ok", text: "Created 24 circuits · max 1,800 VA per 16 A circuit" },
    { kind: "ok", text: "Voltage drop check passed (max 2.1% < 3.0%)" },
    { kind: "cmd", text: 'veylix tag --category "Electrical Fixtures" --renumber' },
    { kind: "ok", text: "Tagged 212 elements · 0 collisions" },
    { kind: "cmd", text: "veylix export --ifc 4.3 --schedules" },
    { kind: "ok", text: "Tower-B_Electrical.ifc (IFC4X3) — 18.4 MB" },
    { kind: "done", text: "Pipeline finished in 6.8 s" },
  ],
};

export const PANEL_SAMPLE = {
  synced: "Live sync",
  panelName: "LP-2A",
  specs: ["400/230 V · 3Φ 4W", "Main 125 A MCCB", "36 kA"],
  columns: ["Ckt", "Description", "Load (VA)", "Breaker", "Phase"],
  rows: [
    ["1", "Receptacles — Open office N", "1,620", "16 A", "L1"],
    ["2", "Receptacles — Open office S", "1,440", "16 A", "L2"],
    ["3", "Lighting — Core & corridor", "960", "10 A", "L3"],
    ["4", "Lighting — Open office", "1,280", "10 A", "L1"],
    ["5", "Meeting rooms 2.01–2.04", "1,800", "16 A", "L2"],
    ["6", "Pantry — dedicated", "2,200", "20 A", "L3"],
  ],
  total: "Total connected: 38.4 kVA · Demand: 29.1 kVA",
};

export const COUNTER_SAMPLE = [
  { value: 24, suffix: "", decimals: 0, label: "Circuits created" },
  { value: 3.2, suffix: " s", decimals: 1, label: "Run time" },
  { value: 212, suffix: "", decimals: 0, label: "Elements tagged" },
  { value: 98, suffix: "%", decimals: 0, label: "Less manual work" },
];

export const MARQUEE_SAMPLE = ["IEC 60364", "NEC 2023", "BS 7671", "ECP 306-1", "IEC 61439", "EN 12464-1", "ISO 19650", "IFC 4.3"];
