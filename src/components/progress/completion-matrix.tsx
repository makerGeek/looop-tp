"use client";

import Link from "next/link";
import type { Exercise, Tier } from "@/types/exercise";
import { TIERS, TIER_ORDER } from "@/lib/tiers";
import { useProgressStore } from "@/stores/progress-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  tiered: Record<Tier, Exercise[]>;
}

export function CompletionMatrix({ tiered }: Props) {
  const hydrated = useHydrated();
  const completed = useProgressStore((s) => s.completed);
  return (
    <div className="space-y-6" data-testid="completion-matrix">
      {TIER_ORDER.map((tier) => {
        const list = tiered[tier];
        const meta = TIERS[tier];
        const doneCount = list.filter(
          (e) => hydrated && completed[e.slug]
        ).length;
        return (
          <div key={tier} data-tier-row={tier}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold" style={{ color: meta.accentVar }}>
                {meta.label}
              </h3>
              <span className="text-xs text-muted-foreground">
                {doneCount} / {list.length} complete
              </span>
            </div>
            <ul className="grid grid-cols-5 gap-2 md:grid-cols-10">
              {list.map((ex) => {
                const done = hydrated && !!completed[ex.slug];
                return (
                  <li key={ex.slug}>
                    <Link
                      href={`/learn/${ex.slug}`}
                      data-slug={ex.slug}
                      data-completed={done}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-md border text-xs font-semibold transition-colors hover:border-primary",
                        done ? "text-background" : "text-muted-foreground"
                      )}
                      style={{
                        background: done ? meta.accentVar : undefined,
                        borderColor: done ? meta.accentVar : undefined,
                      }}
                      title={`${ex.order}. ${ex.title}`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        ex.order
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
