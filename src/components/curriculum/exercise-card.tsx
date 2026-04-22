"use client";

import Link from "next/link";
import type { Exercise } from "@/types/exercise";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "@/components/lesson/tier-badge";
import { Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useProgressStore } from "@/stores/progress-store";
import { useHydrated } from "@/hooks/use-hydrated";

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const hydrated = useHydrated();
  const completed = useProgressStore((s) => !!s.completed[exercise.slug]);
  return (
    <Link
      href={`/learn/${exercise.slug}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      data-testid="exercise-card"
      data-slug={exercise.slug}
      data-tier={exercise.tier}
    >
      <Card className="h-full hover:border-primary/60 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <TierBadge tier={exercise.tier} />
            {hydrated && completed ? (
              <CheckCircle2
                className="h-4 w-4 text-emerald-500"
                data-testid="card-complete-icon"
              />
            ) : (
              <span className="text-xs font-mono text-muted-foreground">
                #{exercise.order.toString().padStart(2, "0")}
              </span>
            )}
          </div>
          <CardTitle className="pt-2 text-base">{exercise.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{exercise.objective}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {exercise.estMinutes} min · {exercise.xp} XP
            </span>
            <span className="flex items-center gap-1 text-primary">
              Start
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
