"use client";

import Link from "next/link";
import type { Exercise, Tier } from "@/types/exercise";
import { TIERS, TIER_ORDER } from "@/lib/tiers";
import { CompletionMatrix } from "@/components/progress/completion-matrix";
import { ProgressRing } from "@/components/progress/progress-ring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProgressStore, completionByTier } from "@/stores/progress-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { Sparkles, Flame, RotateCcw, Play } from "lucide-react";

interface Props {
  tiered: Record<Tier, Exercise[]>;
  all: Exercise[];
}

export function ProgressView({ tiered, all }: Props) {
  const hydrated = useHydrated();
  const xp = useProgressStore((s) => s.xp);
  const streak = useProgressStore((s) => s.streak);
  const state = useProgressStore();
  const reset = useProgressStore((s) => s.reset);
  const byTier = completionByTier(state, tiered);
  const totalCompleted = hydrated
    ? TIER_ORDER.reduce((n, t) => n + byTier[t].completed, 0)
    : 0;
  const overallPct = all.length
    ? Math.round((totalCompleted / all.length) * 100)
    : 0;
  const nextExercise = all.find((e) => !state.completed[e.slug]) ?? all[0];
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10"
      data-testid="progress-page"
    >
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Your progress</h1>
        <p className="text-sm text-muted-foreground">
          Internal progress tracker — everything stored locally in your browser.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Overall
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ProgressRing value={overallPct} size={56} />
            <div>
              <div className="text-xl font-semibold">
                {totalCompleted}/{all.length}
              </div>
              <div className="text-xs text-muted-foreground">exercises</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">XP</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex items-baseline gap-2"
              data-testid="progress-xp"
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-semibold">
                {hydrated ? xp : 0}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex items-baseline gap-2"
              data-testid="progress-streak"
            >
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-semibold">
                {hydrated ? streak : 0}
              </span>
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Keep going
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextExercise ? (
              <Button asChild size="sm" data-testid="continue-cta">
                <Link href={`/learn/${nextExercise.slug}`}>
                  <Play className="h-3.5 w-3.5" />
                  Continue
                </Link>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Course complete 🎉
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-tier completion</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          {TIER_ORDER.map((t) => (
            <div
              key={t}
              className="flex flex-col items-center gap-2"
              data-tier-summary={t}
            >
              <ProgressRing
                value={hydrated ? byTier[t].pct : 0}
                color={TIERS[t].accentVar}
                label={`${TIERS[t].label} ${byTier[t].pct}% complete`}
              />
              <div
                className="text-sm font-medium"
                style={{ color: TIERS[t].accentVar }}
              >
                {TIERS[t].label}
              </div>
              <div className="text-xs text-muted-foreground">
                {hydrated ? byTier[t].completed : 0} / {byTier[t].total}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exercise map</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (
                hydrated &&
                typeof window !== "undefined" &&
                window.confirm("Reset all progress? This cannot be undone.")
              ) {
                reset();
              }
            }}
            data-testid="reset-progress"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset progress
          </Button>
        </CardHeader>
        <CardContent>
          <CompletionMatrix tiered={tiered} />
        </CardContent>
      </Card>
    </div>
  );
}
