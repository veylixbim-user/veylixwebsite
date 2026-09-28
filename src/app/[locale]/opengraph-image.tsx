import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "VEYLIX — Premium electrical BIM plugins for Revit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export default async function OpengraphImage() {
  const svg = await readFile(join(process.cwd(), "public/brand/veylix-mark.svg"), "utf8");
  const logo = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0A0B0F",
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(0,229,255,0.22), transparent 45%), radial-gradient(circle at 95% 90%, rgba(124,92,255,0.22), transparent 45%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 40px 40px, 40px 40px",
          color: "#F5F7FA",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={logo} width={84} height={84} alt="" />
          <div style={{ fontSize: 40, letterSpacing: 12, fontWeight: 700 }}>VEYLIX</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3 }}>Electrical BIM,</div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, color: "#00E5FF" }}>Supercharged.</div>
          <div style={{ fontSize: 28, color: "#8B92A1", marginTop: 10 }}>Premium Revit plugins · Revit 2021–2025 · Priced in EGP</div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 22, color: "#C9CED8" }}>
          {["Circuit", "Conduit", "Panel", "Lighting", "Tag", "Bundle"].map((p) => (
            <div key={p} style={{ display: "flex", padding: "8px 16px", border: "1px solid #2B303A", borderRadius: 12, background: "#12141A" }}>
              {p}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
