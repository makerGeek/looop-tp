import { describe, expect, it } from "vitest";
import {
  allExercises,
  getAdjacent,
  getExerciseBySlug,
  getTieredExercises,
  totalAvailableXp,
} from "@/lib/exercises";

describe("exercises index", () => {
  it("loads exactly 39 exercises", () => {
    expect(allExercises()).toHaveLength(39);
  });

  it("lookup by slug works", () => {
    expect(getExerciseBySlug("jsx-and-components")?.order).toBe(1);
    expect(getExerciseBySlug("does-not-exist")).toBeUndefined();
  });

  it("adjacency follows tier-then-tierOrder, with proper boundaries", () => {
    const first = getAdjacent("jsx-and-components");
    expect(first.prev).toBeUndefined();
    expect(first.next?.slug).toBe("props-and-composition");
    const last = getAdjacent("monorepo-imports");
    expect(last.next).toBeUndefined();
    expect(getAdjacent("missing")).toEqual({});
  });

  it("tiered split matches new curriculum counts", () => {
    const t = getTieredExercises();
    expect(t.beginner).toHaveLength(12);
    expect(t.intermediate).toHaveLength(11);
    expect(t.advanced).toHaveLength(8);
    expect(t.expert).toHaveLength(4);
    expect(t.auxiliary).toHaveLength(4);
  });

  it("totalAvailableXp matches sum of per-tier XP", () => {
    const total = totalAvailableXp();
    // beginner 12*50 + intermediate 11*100 + advanced 8*175 + expert 4*300 + auxiliary 4*125
    expect(total).toBe(12 * 50 + 11 * 100 + 8 * 175 + 4 * 300 + 4 * 125);
  });

  it("orders are unique across all exercises", () => {
    const orders = allExercises().map((e) => e.order);
    const unique = new Set(orders);
    expect(unique.size).toBe(orders.length);
    expect(orders.length).toBe(39);
  });

  it("every exercise has a starter/solution directory and >=2 hints", () => {
    for (const ex of allExercises()) {
      expect(ex.hints.length).toBeGreaterThanOrEqual(2);
      expect(ex.starterPath).toContain(ex.slug);
      expect(ex.solutionPath).toContain(ex.slug);
    }
  });
});
