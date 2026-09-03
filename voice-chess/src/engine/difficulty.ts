/**
 * Difficulty presets.
 *
 * Strength is expressed three ways because the two engines respond to
 * different knobs: `skill` drives Stockfish's `Skill Level` and the local
 * engine's move-choice noise, `targetElo` engages `UCI_LimitStrength`, and
 * `movetimeMs` keeps every level feeling snappy. Thinking time is deliberately
 * short at the low end — a beginner opponent that pauses for two seconds reads
 * as broken rather than thoughtful.
 */
export interface DifficultyPreset {
  id: string;
  label: string;
  blurb: string;
  skill: number;
  targetElo?: number;
  movetimeMs: number;
}

export const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    id: 'casual',
    label: 'Casual',
    blurb: 'Just learning the moves',
    skill: 0,
    targetElo: 800,
    movetimeMs: 200,
  },
  {
    id: 'friendly',
    label: 'Friendly',
    blurb: 'Plays sensibly, misses tactics',
    skill: 3,
    targetElo: 1100,
    movetimeMs: 350,
  },
  {
    id: 'club',
    label: 'Club',
    blurb: 'Punishes obvious mistakes',
    skill: 8,
    targetElo: 1500,
    movetimeMs: 600,
  },
  {
    id: 'sharp',
    label: 'Sharp',
    blurb: 'Tactically alert, plans ahead',
    skill: 14,
    targetElo: 1900,
    movetimeMs: 1000,
  },
  {
    id: 'brutal',
    label: 'Brutal',
    blurb: 'Full strength, no mercy',
    skill: 20,
    movetimeMs: 1500,
  },
];

export const DEFAULT_DIFFICULTY_ID = 'friendly';

export function findDifficulty(id: string): DifficultyPreset {
  return DIFFICULTY_PRESETS.find((preset) => preset.id === id) ?? DIFFICULTY_PRESETS[1]!;
}
