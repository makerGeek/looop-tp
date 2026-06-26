"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Tier } from "@/types/exercise";
import { TIERS } from "@/lib/tiers";

export interface ProgressState {
  completed: Record<string, string>;
  hintsRevealed: Record<string, number>;
  solutionsRevealed: Record<string, boolean>;
  xp: number;
  lastActiveDate: string | null;
  streak: number;
  complete: (slug: string, tier: Tier, xp: number) => void;
  uncomplete: (slug: string) => void;
  revealHint: (slug: string, total: number) => number;
  revealSolution: (slug: string) => void;
  reset: () => void;
}

function todayISO(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / 86400000);
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completed: {},
      hintsRevealed: {},
      solutionsRevealed: {},
      xp: 0,
      lastActiveDate: null,
      streak: 0,

      complete(slug, _tier, xp) {
        const s = get();
        if (s.completed[slug]) return;
        const now = new Date();
        const today = todayISO(now);
        let nextStreak = s.streak;
        if (!s.lastActiveDate) nextStreak = 1;
        else {
          const delta = diffDays(s.lastActiveDate, today);
          if (delta === 0) nextStreak = Math.max(1, s.streak);
          else if (delta === 1) nextStreak = s.streak + 1;
          else nextStreak = 1;
        }
        set({
          completed: { ...s.completed, [slug]: now.toISOString() },
          xp: s.xp + xp,
          lastActiveDate: today,
          streak: nextStreak,
        });
      },

      uncomplete(slug) {
        const s = get();
        if (!s.completed[slug]) return;
        const { [slug]: _, ...rest } = s.completed;
        set({ completed: rest });
      },

      revealHint(slug, total) {
        const s = get();
        const current = s.hintsRevealed[slug] ?? 0;
        const next = Math.min(current + 1, total);
        set({ hintsRevealed: { ...s.hintsRevealed, [slug]: next } });
        return next;
      },

      revealSolution(slug) {
        const s = get();
        set({ solutionsRevealed: { ...s.solutionsRevealed, [slug]: true } });
      },

      reset() {
        set({
          completed: {},
          hintsRevealed: {},
          solutionsRevealed: {},
          xp: 0,
          lastActiveDate: null,
          streak: 0,
        });
      },
    }),
    {
      name: "r26-progress",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return window.localStorage;
      }),
      version: 1,
    }
  )
);

export function completionByTier(
  state: ProgressState,
  allByTier: Record<Tier, { slug: string }[]>
): Record<Tier, { completed: number; total: number; pct: number }> {
  const out = {} as Record<
    Tier,
    { completed: number; total: number; pct: number }
  >;
  for (const tier of Object.keys(TIERS) as Tier[]) {
    const list = allByTier[tier] ?? [];
    const total = list.length;
    const completed = list.filter((e) => state.completed[e.slug]).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    out[tier] = { completed, total, pct };
  }
  return out;
}
