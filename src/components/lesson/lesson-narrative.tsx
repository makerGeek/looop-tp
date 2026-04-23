import type { Exercise } from "@/types/exercise";
import { TierBadge } from "@/components/lesson/tier-badge";
import { HintDrawer } from "@/components/lesson/hint-drawer";
import { Clock, Tag } from "lucide-react";

interface Props {
  exercise: Exercise;
  children: React.ReactNode;
}

export function LessonNarrative({ exercise, children }: Props) {
  return (
    <div
      className="flex h-full flex-col overflow-y-auto bg-background"
      data-testid="lesson-narrative"
    >
      <header className="border-b px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <TierBadge tier={exercise.tier} />
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {exercise.estMinutes} min
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="hidden sm:inline">Exercise </span>
            {exercise.order}
            <span className="hidden sm:inline"> of 39</span>
          </span>
          <span aria-hidden>·</span>
          <span>{exercise.xp} XP</span>
        </div>
        <h1
          className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl"
          data-testid="lesson-title"
        >
          {exercise.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {exercise.objective}
        </p>
        {exercise.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {exercise.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
              >
                <Tag className="h-2.5 w-2.5" />
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </header>
      <article className="prose prose-sm max-w-none px-4 py-5 leading-relaxed dark:prose-invert prose-headings:font-semibold prose-pre:bg-muted prose-pre:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-xs sm:px-6 sm:py-6">
        {children}
      </article>
      <div className="px-4 pb-5 sm:px-6 sm:pb-6">
        <HintDrawer slug={exercise.slug} hints={exercise.hints} />
      </div>
    </div>
  );
}
