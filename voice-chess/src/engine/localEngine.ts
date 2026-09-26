import { Chess } from 'chess.js';

import type { PieceSymbol, Square } from '@/chess/types';
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

/**
 * How deep the quiescence search may go chasing captures.
 *
 * Without it a fixed-depth search suffers the horizon effect: it happily grabs
 * a defended piece because the recapture falls one ply beyond what it looks at.
 * That single omission was the difference between an opponent that feels weak
 * and one that feels broken.
 */
const MAX_QUIESCENCE_PLY = 4;

/**
 * How long the search may hold the thread before handing it back.
 *
 * The engine runs on the UI thread, so whatever happens between two yields is
 * a frozen interface. Yielding only between root moves left single blocks of
 * ~200ms here and far worse on a phone. Slicing on elapsed time instead keeps
 * every block inside a frame's budget.
 */
const SLICE_MS = 8;

export class LocalEngine implements ChessEngine {
  readonly kind = 'builtin' as const;
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

    // One verbose call per iteration, not per node: the root is where the
    // from/to/promotion fields are actually needed, to build the UCI reply.
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

      const slice = createSlicer();

      for (const move of rootMoves) {
        if (this.cancelled) throw new Error('Search cancelled');

        chess.move(move.san);
        const score = -(await negamaxSliced(chess, depth - 1, -Infinity, Infinity, deadline, slice));
        chess.undo();
        iteration.push({ move, score });

        await slice();
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
      kind: 'builtin',
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

/**
 * Inner nodes use `chess.moves()` (SAN strings), never `moves({ verbose: true })`.
 *
 * Verbose generation builds a `Move` object per move, and each one computes the
 * FEN before and after itself — measured at ~4ms per call against ~190µs for
 * the plain list, a 22x difference. At 240 nodes per second the search both
 * played badly and blocked the UI thread for milliseconds at a time. Everything
 * the search needs — capture, promotion, destination — is recoverable from the
 * SAN string plus one cheap board lookup.
 */
/**
 * Hands the thread back whenever the current slice is spent.
 *
 * Returns a function rather than reading a module-level clock so concurrent
 * searches — a hint request landing mid-turn, say — cannot disturb each other.
 */
function createSlicer(): () => Promise<void> {
  let last = Date.now();
  return async () => {
    if (Date.now() - last < SLICE_MS) return;
    await yieldToEventLoop();
    last = Date.now();
  };
}

/**
 * The top plies of the search, driven asynchronously so the UI keeps breathing.
 *
 * Every full-width ply is async; only the quiescence tail below them runs
 * synchronously, and that is depth-capped so it cannot run away.
 */
async function negamaxSliced(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number,
  slice: () => Promise<void>
): Promise<number> {
  if (depth <= 0) return negamax(chess, depth, alpha, beta, deadline);
  if (Date.now() > deadline) return evaluate(chess);

  const moves = chess.moves();
  if (moves.length === 0) return chess.inCheck() ? -MATE_SCORE + (10 - depth) : 0;

  let value = -Infinity;

  for (const san of orderSan(chess, moves)) {
    chess.move(san);
    const score = -(await negamaxSliced(chess, depth - 1, -beta, -alpha, deadline, slice));
    chess.undo();

    if (score > value) value = score;
    if (value > alpha) alpha = value;
    if (alpha >= beta) break;

    await slice();
  }

  return value;
}

function negamax(chess: Chess, depth: number, alpha: number, beta: number, deadline: number): number {
  if (depth <= 0) return quiesce(chess, alpha, beta, deadline, MAX_QUIESCENCE_PLY);
  if (Date.now() > deadline) return evaluate(chess);

  const moves = chess.moves();
  // No legal moves is mate or stalemate — far cheaper to detect this way than
  // to ask `isCheckmate()` and `isStalemate()`, which generate moves again.
  if (moves.length === 0) return chess.inCheck() ? -MATE_SCORE + (10 - depth) : 0;
  // Cheap (~1µs) and worth keeping: stops the engine playing on in a position
  // that can never be won.
  if (chess.isInsufficientMaterial()) return 0;

  let value = -Infinity;

  for (const san of orderSan(chess, moves)) {
    chess.move(san);
    const score = -negamax(chess, depth - 1, -beta, -alpha, deadline);
    chess.undo();

    if (score > value) value = score;
    if (value > alpha) alpha = value;
    if (alpha >= beta) break;
  }

  return value;
}

/**
 * Searches on past the depth limit while captures remain, so the engine sees
 * the recapture a fixed-depth search would miss.
 *
 * `standPat` is the score for declining to capture at all: if standing still
 * already refutes the opponent's hopes, there is nothing to search.
 */
function quiesce(
  chess: Chess,
  alpha: number,
  beta: number,
  deadline: number,
  plyLeft: number
): number {
  // In check, every legal move is forced, so all of them are searched — and a
  // position with none is mate. Standing pat while in check would let the
  // engine "decline" to escape, and dropping terminal detection here entirely
  // would blind it to mates delivered past the depth limit.
  if (chess.inCheck()) {
    const evasions = chess.moves();
    if (evasions.length === 0) return -MATE_SCORE;
    if (plyLeft <= 0 || Date.now() > deadline) return evaluate(chess);

    for (const san of orderSan(chess, evasions)) {
      chess.move(san);
      const score = -quiesce(chess, -beta, -alpha, deadline, plyLeft - 1);
      chess.undo();
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  const standPat = evaluate(chess);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  if (plyLeft <= 0 || Date.now() > deadline) return standPat;

  const noisy = chess.moves().filter(isNoisy);
  if (noisy.length === 0) return alpha;

  for (const san of orderSan(chess, noisy)) {
    chess.move(san);
    const score = -quiesce(chess, -beta, -alpha, deadline, plyLeft - 1);
    chess.undo();

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

/** A capture or a promotion — the moves quiescence keeps chasing. */
function isNoisy(san: string): boolean {
  return san.includes('x') || san.includes('=');
}

/** Most-valuable-victim / least-valuable-attacker, read straight off the SAN. */
function orderSan(chess: Chess, sans: string[]): string[] {
  if (sans.length < 2) return sans;
  return [...sans].sort((a, b) => sanOrder(chess, b) - sanOrder(chess, a));
}

function sanOrder(chess: Chess, san: string): number {
  let score = 0;

  if (san.includes('x')) {
    const target = destinationOf(san);
    // En passant leaves the destination empty; the victim is a pawn either way.
    const victim = target ? (chess.get(target)?.type ?? 'p') : 'p';
    // Taking a queen with a pawn is searched long before taking a pawn with a
    // queen: the cheap capture is far more likely to be the refutation.
    score += PIECE_VALUE[victim] * 10 - PIECE_VALUE[attackerOf(san)];
  }
  if (san.includes('=')) score += 800;

  return score;
}

const PIECE_LETTERS: Record<string, PieceSymbol> = {
  N: 'n',
  B: 'b',
  R: 'r',
  Q: 'q',
  K: 'k',
};

function attackerOf(san: string): PieceSymbol {
  return PIECE_LETTERS[san[0]!] ?? 'p';
}

/** The square a SAN move lands on, or `null` for castling. */
function destinationOf(san: string): Square | null {
  const match = san.replace(/[+#]/g, '').match(/([a-h][1-8])(?:=[NBRQ])?$/);
  return (match?.[1] as Square | undefined) ?? null;
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
