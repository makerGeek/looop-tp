"use client";

import { Flame } from "lucide-react";
import { useProgressStore } from "@/stores/progress-store";
import { useHydrated } from "@/hooks/use-hydrated";

export function StreakFlame() {
  const hydrated = useHydrated();
  const streak = useProgressStore((s) => s.streak);
  const shown = hydrated ? streak : 0;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium"
      title={`${shown}-day streak`}
      data-testid="streak-flame"
    >
      <Flame className="h-3.5 w-3.5 text-orange-500" />
      <span data-testid="streak-count">{shown}</span>
    </span>
  );
}
