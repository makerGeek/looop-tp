import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { exerciseFrontmatterSchema } from "@/lib/exercise-schema";
import { TIER_ORDER } from "@/lib/tiers";
import type { Exercise, Tier } from "@/types/exercise";

const EXERCISE_DIR = path.join(process.cwd(), "src", "content", "exercises");

let cache: Exercise[] | null = null;

function loadExercises(): Exercise[] {
  if (cache) return cache;
  if (!fs.existsSync(EXERCISE_DIR)) {
    cache = [];
    return cache;
  }
  const files = fs
    .readdirSync(EXERCISE_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort();

  const parsed: Exercise[] = files.map((file) => {
    const full = path.join(EXERCISE_DIR, file);
    const raw = fs.readFileSync(full, "utf8");
    const { data, content } = matter(raw);
    const fm = exerciseFrontmatterSchema.parse(data);
    return { ...fm, body: content };
  });

  parsed.sort((a, b) => a.order - b.order);
  cache = parsed;
  return parsed;
}

export function allExercises(): Exercise[] {
  return loadExercises();
}

export function getExerciseBySlug(slug: string): Exercise | undefined {
  return loadExercises().find((e) => e.slug === slug);
}

export function getAdjacent(slug: string): {
  prev?: Exercise;
  next?: Exercise;
} {
  const all = loadExercises();
  const idx = all.findIndex((e) => e.slug === slug);
  if (idx === -1) return {};
  return { prev: all[idx - 1], next: all[idx + 1] };
}

export function getTieredExercises(): Record<Tier, Exercise[]> {
  const all = loadExercises();
  const out = {
    beginner: [],
    intermediate: [],
    advanced: [],
    expert: [],
    auxiliary: [],
  } as Record<Tier, Exercise[]>;
  for (const ex of all) out[ex.tier].push(ex);
  for (const t of TIER_ORDER) out[t].sort((a, b) => a.tierOrder - b.tierOrder);
  return out;
}

export function totalAvailableXp(): number {
  return loadExercises().reduce((sum, e) => sum + e.xp, 0);
}
