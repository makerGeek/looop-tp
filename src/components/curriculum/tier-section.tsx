import type { Exercise, Tier } from "@/types/exercise";
import { TIERS } from "@/lib/tiers";
import { ExerciseCard } from "@/components/curriculum/exercise-card";

interface Props {
  tier: Tier;
  exercises: Exercise[];
}

export function TierSection({ tier, exercises }: Props) {
  const meta = TIERS[tier];
  return (
    <section
      className="space-y-4"
      data-testid="tier-section"
      data-tier={tier}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2
            className="text-lg font-semibold tracking-tight sm:text-xl"
            style={{ color: meta.accentVar }}
          >
            {meta.label}
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {meta.tagline}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground sm:text-xs">
          {exercises.length} exercises · {meta.xpPerExercise} XP each
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {exercises.map((ex) => (
          <ExerciseCard key={ex.slug} exercise={ex} />
        ))}
      </div>
    </section>
  );
}
