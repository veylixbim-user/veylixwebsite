"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { ArrowRight, BookOpen, CornerDownLeft, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductThumb } from "@/components/brand/product-thumb";
import { Kbd } from "@/components/ui/section";
import { useUI } from "@/components/providers/site-providers";
import type { ArtId } from "@/lib/art";

export type CommandItem = {
  id: string;
  group: "pages" | "products" | "help";
  label: string;
  hint?: string;
  href: string;
  product?: { image: string | null; art: ArtId | null };
  keywords?: string;
};

type Props = {
  items: CommandItem[];
  placeholder: string;
  empty: string;
  groups: Record<CommandItem["group"], string>;
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[ً-ٟ]/g, "");
}

export function CommandMenu({ items, placeholder, empty, groups }: Props) {
  const { searchOpen, setSearchOpen } = useUI();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const results = React.useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return items;
    return items.filter((i) => normalize(`${i.label} ${i.hint ?? ""} ${i.keywords ?? ""}`).includes(q));
  }, [items, query]);

  const grouped = React.useMemo(() => {
    const order: CommandItem["group"][] = ["products", "pages", "help"];
    return order
      .map((g) => ({ group: g, items: results.filter((r) => r.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  const flat = grouped.flatMap((g) => g.items);

  function go(item: CommandItem) {
    setSearchOpen(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    }
  }

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let index = -1;

  return (
    <Dialog.Root
      open={searchOpen}
      onOpenChange={(open) => {
        setSearchOpen(open);
        if (!open) {
          setQuery("");
          setActive(0);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="pop fixed inset-x-0 top-[12vh] z-[81] mx-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated shadow-[var(--shadow-lg)]"
          onKeyDown={onKeyDown}
        >
          <Dialog.Title className="sr-only">{placeholder}</Dialog.Title>
          <Dialog.Description className="sr-only">{placeholder}</Dialog.Description>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder={placeholder}
              aria-label={placeholder}
              role="combobox"
              aria-expanded="true"
              aria-controls="command-results"
              aria-activedescendant={flat[active] ? `cmd-${flat[active].id}` : undefined}
              className="h-14 w-full bg-transparent text-[15px] text-fg outline-none placeholder:text-muted"
            />
            <Kbd>Esc</Kbd>
          </div>
          <div ref={listRef} id="command-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
            {grouped.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted">{empty}</p>
            ) : (
              grouped.map((g) => (
                <div key={g.group} role="group" aria-label={groups[g.group]} className="mb-1">
                  <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{groups[g.group]}</p>
                  {g.items.map((item) => {
                    index += 1;
                    const i = index;
                    const selected = i === active;
                    return (
                      <div
                        key={item.id}
                        id={`cmd-${item.id}`}
                        role="option"
                        aria-selected={selected}
                        data-index={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => go(item)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                          selected ? "bg-surface-2" : "hover:bg-surface-2/60",
                        )}
                      >
                        {item.product ? (
                          <ProductThumb image={item.product.image} art={item.product.art} name={item.label} className="size-8 rounded-lg" />
                        ) : (
                          <span className="inline-flex size-8 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted">
                            {item.group === "help" ? <BookOpen className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{item.label}</span>
                          {item.hint ? <span className="block truncate text-xs text-muted">{item.hint}</span> : null}
                        </span>
                        {selected ? <CornerDownLeft className="size-4 text-muted" aria-hidden /> : <ArrowRight className="size-4 text-transparent" aria-hidden />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
