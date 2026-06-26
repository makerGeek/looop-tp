"use client";

import { Sparkles } from "lucide-react";
import { useProgressStore } from "@/stores/progress-store";
import { useHydrated } from "@/hooks/use-hydrated";

export function XpMeter() {
  const hydrated = useHydrated();
  const xp = useProgressStore((s) => s.xp);
  const shown = hydrated ? xp : 0;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium"
      data-testid="xp-meter"
    >
      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
      <span data-testid="xp-count">{shown}</span>
      <span className="text-muted-foreground">XP</span>
    </span>
  );
}
