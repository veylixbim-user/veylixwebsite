import type { Dictionary } from "@/i18n/dictionaries/en";
import { SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { CableTrayRun, OneLinePower, PluginPlug, PowerSceneTabs } from "@/components/mockups/electrical";

/** "From the panel to every fixture": the interactive scene plus three small animated cards. */
export function ElectricalShowcase({ dict }: { dict: Dictionary }) {
  const t = dict.motion;
  const cards = [
    { svg: <PluginPlug />, ...t.cards.plugin },
    { svg: <CableTrayRun />, ...t.cards.tray },
    { svg: <OneLinePower />, ...t.cards.oneline },
  ];
  return (
    <section aria-labelledby="motion-title" className="relative cv-auto py-20 sm:py-28">
      <div className="container-page">
        <SectionHeader id="motion-title" eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
        <Reveal className="mt-14" y={0}>
          <PowerSceneTabs tabs={t.tabs} labels={t.scene} caption={t.caption} />
        </Reveal>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal as="li" key={c.title} delay={i * 0.07}>
              <div className="h-full rounded-2xl border border-border bg-surface p-5" data-play="1">
                <div className="rounded-xl border border-border bg-[var(--plan-bg)] p-3">{c.svg}</div>
                <h3 className="mt-4 font-semibold tracking-tight">{c.title}</h3>
                <p className="mt-1 text-sm text-muted">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
