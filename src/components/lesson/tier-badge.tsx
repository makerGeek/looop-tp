import { TIERS } from "@/lib/tiers";
import type { Tier } from "@/types/exercise";
import { cn } from "@/lib/cn";

export function TierBadge({
  tier,
  className,
}: {
  tier: Tier;
  className?: string;
}) {
  const meta = TIERS[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        borderColor: meta.accentVar,
        color: meta.accentVar,
      }}
      data-tier={tier}
    >
      <span
        aria-hidden
        className="tier-dot"
        style={{ background: meta.accentVar }}
      />
      {meta.label}
    </span>
  );
}
