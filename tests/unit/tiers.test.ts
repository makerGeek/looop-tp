import { describe, expect, it } from "vitest";
import { TIERS, TIER_ORDER } from "@/lib/tiers";

describe("tiers", () => {
  it("has exactly 5 tiers", () => {
    expect(TIER_ORDER).toHaveLength(5);
    expect(Object.keys(TIERS)).toHaveLength(5);
  });

  it("orders ascend by difficulty", () => {
    const orders = TIER_ORDER.map((t) => TIERS[t].order);
    expect(orders).toEqual([0, 1, 2, 3, 4]);
  });

  it("expert has the highest XP per exercise", () => {
    const xp = TIER_ORDER.map((t) => TIERS[t].xpPerExercise);
    expect(Math.max(...xp)).toBe(TIERS.expert.xpPerExercise);
  });
});
