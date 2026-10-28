import type { Metadata } from "next";
import Link from "next/link";
import { ART, ART_IDS } from "@/lib/art";
import { LogoMark, Logo } from "@/components/brand/logo";
import { ProductIcon } from "@/components/brand/product-icon";
import { ProductArt } from "@/components/mockups/product-art";
import { CircuitTraces } from "@/components/mockups/circuit-traces";
import { FloorPlan } from "@/components/mockups/floor-plan";
import { CableTrayRun, OneLinePower, PluginPlug, PowerScene } from "@/components/mockups/electrical";
import { RevitWindow } from "@/components/mockups/revit-window";
import { AdminHeader } from "@/components/admin/page-header";
import { AssetCard, LibraryOptions } from "@/components/admin/library/asset-card";
import { BeforeAfterDemo, CounterDemo, MarqueeDemo, PanelDemo, TerminalDemo } from "@/components/admin/library/demos";

export const metadata: Metadata = { title: "Design library" };

function Section({ id, title, sub, children }: { id: string; title: string; sub: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-14">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">{sub}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function LibraryPage() {
  return (
    <>
      <AdminHeader
        title="Design library"
        sub="Every VEYLIX illustration and animation, ready to reuse. Replay the animations, download them as SVG (animated or still) or PNG for slides, social posts and the plugin's own UI. Downloads use the colours of the theme you are viewing."
      />
      <LibraryOptions>
        <Section
          id="lib-art"
          title="Product artwork"
          sub={
            <>
              Animated line-art for product cards. To use one on the website, open a product and pick it under{" "}
              <Link href="/admin/products" className="text-accent-fg underline-offset-4 hover:underline">
                Card artwork
              </Link>
              . Hover a preview to replay it.
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ART_IDS.map((id) => (
              <AssetCard key={id} title={ART[id].label} note={<span className="font-mono">{id}</span>} fileName={`veylix-${id}`} previewClassName="bg-blueprint m-1.5 aspect-[2/1] rounded-xl border border-border bg-bg-elevated p-5">
                <ProductArt art={id} />
              </AssetCard>
            ))}
          </div>
        </Section>

        <Section id="lib-icons" title="Icon badges" sub="The small product badges used next to product names, in the cart and in menus. They appear automatically when a product uses the matching artwork.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ART_IDS.map((id) => (
              <AssetCard key={id} title={ART[id].label} fileName={`veylix-icon-${id}`} replay={false} previewClassName="grid place-items-center py-8">
                <ProductIcon art={id} size="lg" />
              </AssetCard>
            ))}
          </div>
        </Section>

        <Section id="lib-brand" title="Brand" sub="The VEYLIX mark, with its glow, drawn-in animation and flat variants.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AssetCard title="Logo mark" note="With glow" fileName="veylix-mark" replay={false} previewClassName="grid place-items-center bg-bg-elevated py-10">
              <LogoMark className="size-24" />
            </AssetCard>
            <AssetCard title="Logo mark — animated" note="Draws itself in" fileName="veylix-mark-animated" previewClassName="grid place-items-center bg-bg-elevated py-10">
              <LogoMark className="size-24" animated />
            </AssetCard>
            <AssetCard title="Logo mark — flat" note="No glow, for small sizes" fileName="veylix-mark-flat" replay={false} previewClassName="grid place-items-center bg-bg-elevated py-10">
              <LogoMark className="size-24" glow={false} />
            </AssetCard>
            <AssetCard title="Logo lockup" note="Mark + wordmark (SVG exports the mark)" fileName="veylix-logo" replay={false} previewClassName="grid place-items-center bg-bg-elevated py-10">
              <Logo markClassName="size-12" className="[&>span:last-child]:text-xl" />
            </AssetCard>
          </div>
        </Section>

        <Section id="lib-motion" title="Animations & mockups" sub="The animated scenes from the original homepage. Press Replay to run them again.">
          <div className="grid gap-4 xl:grid-cols-2">
            <AssetCard title="Hero circuit traces" note="Background animation behind the homepage headline" fileName="veylix-circuit-traces" previewClassName="bg-blueprint relative m-1.5 aspect-[1440/520] overflow-hidden rounded-xl border border-border bg-bg-elevated">
              <CircuitTraces className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" />
            </AssetCard>
            <AssetCard title="Command palette" note="Types itself out — HTML animation (record the screen to reuse it)" fileName="veylix-terminal" exportable={false} previewClassName="p-1.5">
              <TerminalDemo />
            </AssetCard>
            <AssetCard title="Panel schedule + one-line" note="SVG export saves the one-line diagram" fileName="veylix-one-line" previewClassName="p-1.5">
              <PanelDemo />
            </AssetCard>
            <AssetCard title="Before / after slider" note="Drag the handle — SVG export saves the “before” plan" fileName="veylix-before-after" previewClassName="p-1.5">
              <BeforeAfterDemo />
            </AssetCard>
            <AssetCard title="Floor plan — circuited" note="Home-runs draw in" fileName="veylix-floor-plan" previewClassName="m-1.5 overflow-hidden rounded-xl border border-border bg-[#0b1017] p-3">
              <FloorPlan variant="after" animate />
            </AssetCard>
            <AssetCard title="Panel → tray → conduit → fixtures (powered)" note="Current flows, lights switch on — animated SVG" fileName="veylix-power-scene" previewClassName="m-1.5 overflow-hidden rounded-xl border border-border bg-[var(--plan-bg)] p-2">
              <PowerScene layer="power" labels={{ tray: "Ladder tray along the corridor", conduit: "Conduit to the sockets and the pump", load: "38.4 kVA connected · 5 circuits live" }} />
            </AssetCard>
            <AssetCard title="Smart wiring layer" note="Circuits drawn from the panel to every device" fileName="veylix-wiring-scene" previewClassName="m-1.5 overflow-hidden rounded-xl border border-border bg-[var(--plan-bg)] p-2">
              <PowerScene layer="wiring" />
            </AssetCard>
            <AssetCard title="Conduit layout" note="Pipes and fittings draw in" fileName="veylix-conduit-scene" previewClassName="m-1.5 overflow-hidden rounded-xl border border-border bg-[var(--plan-bg)] p-2">
              <PowerScene layer="conduit" labels={{ tray: "", conduit: "Conduit to the sockets and the pump", load: "" }} />
            </AssetCard>
            <AssetCard title="Cable tray / ladder layout" note="Ladder trunk along the ceiling" fileName="veylix-tray-scene" previewClassName="m-1.5 overflow-hidden rounded-xl border border-border bg-[var(--plan-bg)] p-2">
              <PowerScene layer="tray" labels={{ tray: "Ladder tray along the corridor", conduit: "", load: "" }} />
            </AssetCard>
            <AssetCard title="Plugin clicking into Revit" note="Loops — the VEYLIX card slides into the ribbon" fileName="veylix-plugin-plug" previewClassName="m-1.5 rounded-xl border border-border bg-[var(--plan-bg)] p-4">
              <PluginPlug />
            </AssetCard>
            <AssetCard title="Cable tray with cables" note="Cables flowing through a ladder tray" fileName="veylix-cable-tray" previewClassName="m-1.5 rounded-xl border border-border bg-[var(--plan-bg)] p-4">
              <CableTrayRun />
            </AssetCard>
            <AssetCard title="One-line power flow" note="Utility → breaker → panel → circuits → loads" fileName="veylix-one-line-power" previewClassName="m-1.5 rounded-xl border border-border bg-[var(--plan-bg)] p-4">
              <OneLinePower />
            </AssetCard>
            <AssetCard title="Revit window" note="Homepage product mockup — HTML" fileName="veylix-revit-window" exportable={false} replay={false} previewClassName="p-1.5">
              <RevitWindow file="Tower-B_Electrical.rvt" status="VEYLIX ready" schedule="Panel LP-2A" connected="Connected load" demand="Demand" />
            </AssetCard>
            <AssetCard title="Count-up numbers" note="Counts up when scrolled into view — HTML" fileName="veylix-counter" exportable={false} previewClassName="">
              <CounterDemo />
            </AssetCard>
            <AssetCard title="Marquee strip" note="Endless scrolling row — HTML" fileName="veylix-marquee" exportable={false} replay={false}>
              <MarqueeDemo />
            </AssetCard>
          </div>
        </Section>
      </LibraryOptions>
    </>
  );
}
