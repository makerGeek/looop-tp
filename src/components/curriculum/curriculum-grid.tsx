import type { Exercise, Tier } from "@/types/exercise";
import { TIER_ORDER } from "@/lib/tiers";
import { TierSection } from "@/components/curriculum/tier-section";

interface Props {
  tiered: Record<Tier, Exercise[]>;
}

export function CurriculumGrid({ tiered }: Props) {
  return (
    <div className="space-y-10" data-testid="curriculum-grid">
      {TIER_ORDER.map((t) => (
        <TierSection key={t} tier={t} exercises={tiered[t]} />
      ))}
    </div>
  );
}
