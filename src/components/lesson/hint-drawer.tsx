"use client";

import { useState, useEffect } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgressStore } from "@/stores/progress-store";
import { useHydrated } from "@/hooks/use-hydrated";

interface Props {
  slug: string;
  hints: string[];
}

export function HintDrawer({ slug, hints }: Props) {
  const hydrated = useHydrated();
  const revealed = useProgressStore((s) => s.hintsRevealed[slug] ?? 0);
  const revealHint = useProgressStore((s) => s.revealHint);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "?" && !(e.target instanceof HTMLInputElement)) {
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shown = hydrated ? revealed : 0;
  const canReveal = shown < hints.length;

  return (
    <section
      className="rounded-lg border bg-muted/30"
      data-testid="hint-drawer"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
        aria-expanded={open}
        aria-controls={`hints-${slug}`}
        data-testid="hint-toggle"
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Hints
          <span className="text-xs text-muted-foreground">
            ({shown}/{hints.length})
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div
          id={`hints-${slug}`}
          className="space-y-2 border-t px-4 py-3 text-sm"
          data-testid="hint-panel"
        >
          {shown === 0 ? (
            <p className="text-muted-foreground">
              Stuck? Reveal hints one at a time.
            </p>
          ) : (
            <ol className="list-decimal space-y-2 pl-5">
              {hints.slice(0, shown).map((h, i) => (
                <li key={i} data-testid={`hint-${i + 1}`}>
                  {h}
                </li>
              ))}
            </ol>
          )}
          {canReveal ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => revealHint(slug, hints.length)}
              data-testid="hint-reveal"
            >
              Reveal hint {shown + 1}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              All hints revealed.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
