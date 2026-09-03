import type { Move } from '@/chess/types';

/** Where the CPU's move came from, surfaced in the UI so it's never a mystery. */
export type EngineKind = 'stockfish' | 'local';

export type EngineStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; kind: EngineKind; name: string }
  | { state: 'thinking'; kind: EngineKind }
  | { state: 'failed'; reason: string };

export interface SearchRequest {
  fen: string;
  /** Hard cap on thinking time. The UI never waits longer than this. */
  movetimeMs: number;
  /** 0 (beginner) – 20 (full strength). Mapped per engine. */
  skill: number;
  /** Optional Elo target; ignored by engines that can't limit strength. */
  targetElo?: number;
}

export interface SearchResult {
  /** Long algebraic, e.g. `e2e4`, `e7e8q`. Still validated by `ChessGame`. */
  bestMove: string;
  /** Centipawn score from the engine's point of view, when reported. */
  scoreCp?: number;
  mateIn?: number;
  depth?: number;
  kind: EngineKind;
}

export interface ChessEngine {
  readonly kind: EngineKind;
  readonly name: string;
  /** Resolves once the engine can accept searches. */
  init(): Promise<void>;
  search(request: SearchRequest): Promise<SearchResult>;
  /** Aborts the current search. Safe to call when idle. */
  stop(): void;
  dispose(): void;
}

/**
 * `SearchResult.bestMove` is a *suggestion*, exactly like a spoken move.
 *
 * The game store feeds it through `ChessGame.tryMove()` like anything else, so
 * a buggy or hostile engine can no more put an illegal move on the board than a
 * misheard sentence can.
 */
export function isPlausibleUciMove(value: string): boolean {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value);
}

export type { Move };
