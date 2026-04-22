import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProgressStore, completionByTier } from "@/stores/progress-store";
import type { Tier } from "@/types/exercise";

function reset() {
  useProgressStore.getState().reset();
  localStorage.clear();
}

describe("progress store", () => {
  beforeEach(() => reset());

  it("starts with zero XP and streak", () => {
    const s = useProgressStore.getState();
    expect(s.xp).toBe(0);
    expect(s.streak).toBe(0);
    expect(s.completed).toEqual({});
  });

  it("complete awards XP once per slug", () => {
    useProgressStore.getState().complete("a", "beginner", 50);
    useProgressStore.getState().complete("a", "beginner", 50);
    expect(useProgressStore.getState().xp).toBe(50);
  });

  it("complete increases XP per unique slug", () => {
    useProgressStore.getState().complete("a", "beginner", 50);
    useProgressStore.getState().complete("b", "advanced", 175);
    expect(useProgressStore.getState().xp).toBe(225);
  });

  it("uncomplete removes the slug", () => {
    useProgressStore.getState().complete("a", "beginner", 50);
    useProgressStore.getState().uncomplete("a");
    expect(useProgressStore.getState().completed.a).toBeUndefined();
  });

  it("uncomplete is idempotent for unknown slugs", () => {
    useProgressStore.getState().uncomplete("never-completed");
    expect(useProgressStore.getState().completed).toEqual({});
  });

  it("streak starts at 1 on first completion", () => {
    vi.setSystemTime(new Date("2026-04-22T10:00:00Z"));
    useProgressStore.getState().complete("a", "beginner", 50);
    expect(useProgressStore.getState().streak).toBe(1);
    vi.useRealTimers();
  });

  it("streak increments on consecutive days", () => {
    vi.setSystemTime(new Date("2026-04-22T10:00:00Z"));
    useProgressStore.getState().complete("a", "beginner", 50);
    vi.setSystemTime(new Date("2026-04-23T10:00:00Z"));
    useProgressStore.getState().complete("b", "beginner", 50);
    expect(useProgressStore.getState().streak).toBe(2);
    vi.useRealTimers();
  });

  it("streak resets after a skipped day", () => {
    vi.setSystemTime(new Date("2026-04-22T10:00:00Z"));
    useProgressStore.getState().complete("a", "beginner", 50);
    vi.setSystemTime(new Date("2026-04-25T10:00:00Z"));
    useProgressStore.getState().complete("b", "beginner", 50);
    expect(useProgressStore.getState().streak).toBe(1);
    vi.useRealTimers();
  });

  it("streak stays the same on same-day completions", () => {
    vi.setSystemTime(new Date("2026-04-22T10:00:00Z"));
    useProgressStore.getState().complete("a", "beginner", 50);
    useProgressStore.getState().complete("b", "beginner", 50);
    expect(useProgressStore.getState().streak).toBe(1);
    vi.useRealTimers();
  });

  it("revealHint clamps to total and increments once per call", () => {
    const first = useProgressStore.getState().revealHint("slug", 3);
    expect(first).toBe(1);
    useProgressStore.getState().revealHint("slug", 3);
    useProgressStore.getState().revealHint("slug", 3);
    const overflow = useProgressStore.getState().revealHint("slug", 3);
    expect(overflow).toBe(3);
    expect(useProgressStore.getState().hintsRevealed.slug).toBe(3);
  });

  it("revealSolution marks slug as revealed", () => {
    useProgressStore.getState().revealSolution("slug");
    expect(useProgressStore.getState().solutionsRevealed.slug).toBe(true);
  });

  it("reset clears all progress", () => {
    useProgressStore.getState().complete("a", "beginner", 50);
    useProgressStore.getState().revealHint("a", 2);
    useProgressStore.getState().reset();
    const s = useProgressStore.getState();
    expect(s.xp).toBe(0);
    expect(s.completed).toEqual({});
    expect(s.hintsRevealed).toEqual({});
    expect(s.streak).toBe(0);
  });
});

describe("completionByTier", () => {
  beforeEach(() => reset());

  const tiered: Record<Tier, { slug: string }[]> = {
    beginner: [{ slug: "a" }, { slug: "b" }],
    intermediate: [{ slug: "c" }],
    advanced: [],
    expert: [],
    auxiliary: [],
  };

  it("computes per-tier completion counts and pct", () => {
    useProgressStore.getState().complete("a", "beginner", 50);
    const result = completionByTier(useProgressStore.getState(), tiered);
    expect(result.beginner).toEqual({ completed: 1, total: 2, pct: 50 });
    expect(result.intermediate).toEqual({ completed: 0, total: 1, pct: 0 });
    expect(result.advanced).toEqual({ completed: 0, total: 0, pct: 0 });
  });

  it("returns 0% when the tier has zero exercises", () => {
    const result = completionByTier(useProgressStore.getState(), tiered);
    expect(result.advanced.pct).toBe(0);
    expect(result.expert.pct).toBe(0);
  });
});
