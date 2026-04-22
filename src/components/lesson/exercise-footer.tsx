"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgressStore } from "@/stores/progress-store";
import { useHydrated } from "@/hooks/use-hydrated";
import type { Exercise, Tier } from "@/types/exercise";
import { useKeyboardNav } from "@/hooks/use-keyboard-nav";

interface Props {
  exercise: Exercise;
  prev?: Exercise;
  next?: Exercise;
}

export function ExerciseFooter({ exercise, prev, next }: Props) {
  const hydrated = useHydrated();
  const completed = useProgressStore((s) => !!s.completed[exercise.slug]);
  const complete = useProgressStore((s) => s.complete);
  const uncomplete = useProgressStore((s) => s.uncomplete);

  useKeyboardNav(prev?.slug, next?.slug);

  return (
    <footer
      className="flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-6 py-4"
      data-testid="exercise-footer"
    >
      <div>
        {prev ? (
          <Button variant="outline" asChild>
            <Link href={`/learn/${prev.slug}`} data-testid="prev-link">
              <ArrowLeft className="h-4 w-4" />
              {prev.title}
            </Link>
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">
            Start of course
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant={hydrated && completed ? "secondary" : "default"}
          onClick={() => {
            if (!hydrated) return;
            if (completed) uncomplete(exercise.slug);
            else complete(exercise.slug, exercise.tier as Tier, exercise.xp);
          }}
          data-testid="complete-toggle"
        >
          {hydrated && completed ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Completed · +{exercise.xp} XP
            </>
          ) : (
            <>
              <Circle className="h-4 w-4" />
              Mark complete · +{exercise.xp} XP
            </>
          )}
        </Button>
        {next ? (
          <Button asChild>
            <Link href={`/learn/${next.slug}`} data-testid="next-link">
              {next.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" asChild>
            <Link href="/progress" data-testid="finish-link">
              Finish course
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </footer>
  );
}
