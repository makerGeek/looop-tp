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
      className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t bg-background/95 px-3 py-3 sm:grid-cols-3 sm:gap-3 sm:px-6 sm:py-4"
      data-testid="exercise-footer"
    >
      <div className="justify-self-start">
        {prev ? (
          <Button variant="outline" size="sm" asChild className="sm:h-9 sm:px-4">
            <Link
              href={`/learn/${prev.slug}`}
              data-testid="prev-link"
              aria-label={`Previous: ${prev.title}`}
              title={prev.title}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline max-w-[14ch] truncate">
                {prev.title}
              </span>
              <span className="sm:hidden">Prev</span>
            </Link>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground sm:text-sm">
            <span className="hidden sm:inline">Start of course</span>
            <span className="sm:hidden">Start</span>
          </span>
        )}
      </div>
      <div className="justify-self-center">
        <Button
          variant={hydrated && completed ? "secondary" : "default"}
          size="sm"
          className="sm:h-9 sm:px-4"
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
              <span className="hidden sm:inline">
                Completed · +{exercise.xp} XP
              </span>
              <span className="sm:hidden">Done · +{exercise.xp}</span>
            </>
          ) : (
            <>
              <Circle className="h-4 w-4" />
              <span className="hidden sm:inline">
                Mark complete · +{exercise.xp} XP
              </span>
              <span className="sm:hidden">+{exercise.xp} XP</span>
            </>
          )}
        </Button>
      </div>
      <div className="justify-self-end">
        {next ? (
          <Button size="sm" className="sm:h-9 sm:px-4" asChild>
            <Link
              href={`/learn/${next.slug}`}
              data-testid="next-link"
              aria-label={`Next: ${next.title}`}
              title={next.title}
            >
              <span className="hidden sm:inline max-w-[14ch] truncate">
                {next.title}
              </span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="sm:h-9 sm:px-4"
            asChild
          >
            <Link href="/progress" data-testid="finish-link">
              <span className="hidden sm:inline">Finish course</span>
              <span className="sm:hidden">Finish</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </footer>
  );
}
