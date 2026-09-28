"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEME_KEY = "veylix-theme";

export function ThemeToggle({ label, className }: { label: string; className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      <Sun className="size-[18px] light:hidden" aria-hidden />
      <Moon className="hidden size-[18px] light:block" aria-hidden />
    </button>
  );
}

/** Inline, render-blocking script: applies the saved theme before first paint (dark by default). */
export const themeScript = `(function(){document.documentElement.classList.add('js');try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`;
