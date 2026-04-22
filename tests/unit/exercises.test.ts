import { describe, expect, it } from "vitest";
import {
  allExercises,
  getAdjacent,
  getExerciseBySlug,
  getTieredExercises,
  totalAvailableXp,
} from "@/lib/exercises";

describe("exercises index", () => {
  it("loads exactly 30 exercises", () => {
    expect(allExercises()).toHaveLength(30);
  });

  it("lookup by slug works", () => {
    expect(getExerciseBySlug("jsx-and-components")?.order).toBe(1);
    expect(getExerciseBySlug("does-not-exist")).toBeUndefined();
  });

  it("adjacency returns prev/next and boundaries", () => {
    const first = getAdjacent("jsx-and-components");
    expect(first.prev).toBeUndefined();
    expect(first.next?.order).toBe(2);
    const last = getAdjacent("design-tokens-theming");
    expect(last.next).toBeUndefined();
    expect(last.prev?.order).toBe(29);
    expect(getAdjacent("missing")).toEqual({});
  });

  it("tiered split matches curriculum counts", () => {
    const t = getTieredExercises();
    expect(t.beginner).toHaveLength(10);
    expect(t.intermediate).toHaveLength(8);
    expect(t.advanced).toHaveLength(6);
    expect(t.expert).toHaveLength(3);
    expect(t.auxiliary).toHaveLength(3);
  });

  it("totalAvailableXp matches sum of per-tier XP", () => {
    const total = totalAvailableXp();
    // beginner 10*50 + intermediate 8*100 + advanced 6*175 + expert 3*300 + auxiliary 3*125
    expect(total).toBe(10 * 50 + 8 * 100 + 6 * 175 + 3 * 300 + 3 * 125);
  });

  it("orders are unique and contiguous 1..30", () => {
    const orders = allExercises()
      .map((e) => e.order)
      .sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("every exercise has a starter/solution directory and >=2 hints", () => {
    for (const ex of allExercises()) {
      expect(ex.hints.length).toBeGreaterThanOrEqual(2);
      expect(ex.starterPath).toContain(ex.slug);
      expect(ex.solutionPath).toContain(ex.slug);
    }
  });
});
