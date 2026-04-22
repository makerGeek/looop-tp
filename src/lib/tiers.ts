import type { Tier } from "@/types/exercise";

export interface TierMeta {
  id: Tier;
  label: string;
  tagline: string;
  xpPerExercise: number;
  accentVar: string;
  order: number;
}

export const TIERS: Record<Tier, TierMeta> = {
  beginner: {
    id: "beginner",
    label: "Beginner",
    tagline: "React 19 fundamentals, TS strict, Tailwind basics.",
    xpPerExercise: 50,
    accentVar: "var(--color-tier-beginner)",
    order: 0,
  },
  intermediate: {
    id: "intermediate",
    label: "Intermediate",
    tagline: "Hooks, forms, routing, data, state.",
    xpPerExercise: 100,
    accentVar: "var(--color-tier-intermediate)",
    order: 1,
  },
  advanced: {
    id: "advanced",
    label: "Advanced",
    tagline: "React 19 concurrent, RSC, Next 15.",
    xpPerExercise: 175,
    accentVar: "var(--color-tier-advanced)",
    order: 2,
  },
  expert: {
    id: "expert",
    label: "Expert",
    tagline: "Performance, testing, full-stack.",
    xpPerExercise: 300,
    accentVar: "var(--color-tier-expert)",
    order: 3,
  },
  auxiliary: {
    id: "auxiliary",
    label: "Auxiliary",
    tagline: "Adjacent craft: a11y, tooling, design systems.",
    xpPerExercise: 125,
    accentVar: "var(--color-tier-auxiliary)",
    order: 4,
  },
};

export const TIER_ORDER: Tier[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "auxiliary",
];
