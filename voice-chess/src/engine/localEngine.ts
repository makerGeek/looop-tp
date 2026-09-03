import { Chess } from 'chess.js';

import type { PieceSymbol } from '@/chess/types';
import type { ChessEngine, SearchRequest, SearchResult } from './types';

/**
 * A small, dependency-free chess engine used when Stockfish can't start.
 *
 * It exists so that "no network" or "an unusual WebView" degrades into a
 * slightly weaker opponent instead of a broken app. It is a plain negamax with
 * alpha-beta, piece-square tables and a quiescence-free horizon — perfectly
 * pleasant at club-beginner strength and no more.
 *
 * Search is chunked at the root and yields to the event loop between root
 * moves, so the board keeps animating while it thinks.
 */

const PIECE_VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Piece-square tables, written from White's point of view, a8 first. They are
// deliberately mild: enough to make the engine develop and castle rather than
// shuffle, without pretending to be positional understanding.
const PST: Record<PieceSymbol, number[]> = {
  p: [
      0,  0,  0,  0,  0,  0,  0,  0,
     50, 50, 50, 50, 50, 50, 50, 50,
     10, 10, 20, 30, 30, 20, 10, 10,
      5,  5, 10, 25, 25, 10,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5, -5,-10,  0,  0,-10, -5,  5,
      5, 10, 10,-20,-20, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

const MATE_SCORE = 100_000;

export class LocalEngine implements ChessEngine {
  readonly kind = 'local' as const;
  readonly name = 'Built-in engine';

  private cancelled = false;

  async init(): Promise<void> {
    // Nothing to boot — that's the point of this engine.
  }

  async search(request: SearchRequest): Promise<SearchResult> {
    this.cancelled = false;
    const chess = new Chess(request.fen);
    const deadline = Date.now() + Math.max(120, request.movetimeMs);
    const maxDepth = depthForSkill(request.skill);

    let rootMoves = chess.moves({ verbose: true });
    if (rootMoves.length === 0) throw new Error('No legal moves to search');

    // Iterative deepening. The point is not speed but *safety*: however tight
    // the time budget, a complete depth-1 pass has always finished, so the
    // engine never returns the first move it happened to look at.
    let scored: { move: (typeof rootMoves)[number]; score: number }[] = [];
    let depthReached = 0;

    for (let depth = 1; depth <= maxDepth; depth += 1) {
      const iteration: typeof scored = [];
      let ranOut = false;

      for (const move of rootMoves) {
        if (this.cancelled) throw new Error('Search cancelled');

        chess.move(move.san);
        const score = -negamax(chess, depth - 1, -Infinity, Infinity, deadline);
        chess.undo();
        iteration.push({ move, score });

        // Give the UI thread a chance between root moves.
        await yieldToEventLoop();
        if (Date.now() > deadline) {
          ranOut = true;
          break;
        }
      }

      // A partial iteration is only trusted when there is nothing better.
      if (!ranOut || scored.length === 0) {
        scored = iteration;
        depthReached = depth;
      }
      if (ranOut) break;

      // Best-first ordering makes the next, deeper pass prune far more.
      rootMoves = [...iteration].sort((a, b) => b.score - a.score).map((entry) => entry.move);
    }

    const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
    const chosen = chooseWithSkill(scored, best, request.skill);

    return {
      bestMove: toUci(chosen.move),
      scoreCp: Math.round(chosen.score),
      depth: depthReached,
      kind: 'local',
    };
  }

  stop(): void {
    this.cancelled = true;
  }

  dispose(): void {
    this.cancelled = true;
  }
}

/**
 * Weak levels don't search deeper and play worse — they search the same and
 * then *pick* worse, which produces recognisable human-style mistakes rather
 * than an opponent that simply looks blind.
 */
function chooseWithSkill<T extends { score: number }>(scored: T[], best: T, skill: number): T {
  if (scored.length === 0) return best;
  const clamped = Math.min(20, Math.max(0, skill));
  if (clamped >= 18) return best;

  // Window of "acceptable" moves widens as skill drops: ~15cp at level 17,
  // ~300cp at level 0.
  const window = (20 - clamped) * 15;
  const pool = scored.filter((entry) => entry.score >= best.score - window);
  return pool[Math.floor(Math.random() * pool.length)] ?? best;
}

function depthForSkill(skill: number): number {
  if (skill <= 4) return 2;
  if (skill <= 12) return 3;
  return 4;
}

function negamax(chess: Chess, depth: number, alpha: number, beta: number, deadline: number): number {
  if (chess.isCheckmate()) return -MATE_SCORE + (10 - depth);
  if (chess.isDraw() || chess.isStalemate()) return 0;
  if (depth <= 0 || Date.now() > deadline) return evaluate(chess);

  const moves = orderMoves(chess.moves({ verbose: true }));
  let value = -Infinity;

  for (const move of moves) {
    chess.move(move.san);
    const score = -negamax(chess, depth - 1, -beta, -alpha, deadline);
    chess.undo();

    if (score > value) value = score;
    if (value > alpha) alpha = value;
    if (alpha >= beta) break;
  }

  return value;
}

/** Captures first — the cheapest move ordering that meaningfully helps pruning. */
function orderMoves<T extends { captured?: PieceSymbol; promotion?: PieceSymbol }>(moves: T[]): T[] {
  return [...moves].sort((a, b) => scoreOrder(b) - scoreOrder(a));
}

function scoreOrder(move: { captured?: PieceSymbol; promotion?: PieceSymbol }): number {
  return (move.captured ? PIECE_VALUE[move.captured] : 0) + (move.promotion ? 800 : 0);
}

/** Static evaluation from the side-to-move's point of view, in centipawns. */
export function evaluate(chess: Chess): number {
  let score = 0;
  const board = chess.board();

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row]![col];
      if (!piece) continue;
      // `board()` is rank 8 first, which is exactly how the tables are written
      // for White; Black reads the same table mirrored vertically.
      const index = piece.color === 'w' ? row * 8 + col : (7 - row) * 8 + col;
      const value = PIECE_VALUE[piece.type] + (PST[piece.type][index] ?? 0);
      score += piece.color === 'w' ? value : -value;
    }
  }

  return chess.turn() === 'w' ? score : -score;
}

function toUci(move: { from: string; to: string; promotion?: string }): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
