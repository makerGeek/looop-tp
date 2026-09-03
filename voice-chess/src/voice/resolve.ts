import { PIECE_NAMES } from '@/chess/board';
import type { Move, Square } from '@/chess/types';
import type { MoveConstraints } from './intents';

/**
 * The trust boundary.
 *
 * Everything upstream — speech recognition, the offline grammar, the language
 * model — produces `MoveConstraints`: a *description* of what the player
 * seemed to say. This module is where a description meets reality. It only
 * ever selects from the legal-move list produced by `ChessGame`, so a
 * hallucinated move, a misheard square or a nonsense SAN string can do no more
 * than fail to match.
 */
export type MoveResolution =
  /** Exactly one legal move fits. */
  | { status: 'resolved'; move: Move }
  /** One from/to pair, four possible promotion pieces. */
  | { status: 'needs-promotion'; from: Square; to: Square; candidates: Move[] }
  /** Several legal moves fit; ask the player which one. */
  | { status: 'ambiguous'; candidates: Move[] }
  /** Nothing legal fits. `suggestions` powers a helpful reply. */
  | { status: 'illegal'; constraints: MoveConstraints; suggestions: Move[] }
  /** The utterance carried no move information at all. */
  | { status: 'empty' };

export function resolveMove(legalMoves: Move[], constraints: MoveConstraints): MoveResolution {
  if (!hasAnyConstraint(constraints)) return { status: 'empty' };

  // 1. A SAN string is treated purely as a lookup key. If it names a legal
  //    move we are done; if it doesn't, we quietly fall through to the
  //    structural constraints rather than trusting the string.
  if (constraints.san) {
    const wanted = canonicalSan(constraints.san);
    const hit = legalMoves.find((move) => canonicalSan(move.san) === wanted);
    if (hit) return { status: 'resolved', move: hit };
  }

  // 2. Structural filtering against the legal-move list.
  let candidates = legalMoves.filter((move) => matches(move, constraints));

  // A promotion piece the speaker didn't mention shouldn't shrink the set to
  // zero, and a "takes" that turns out to be wrong is better reported as an
  // illegal move than silently ignored — so only the promotion filter relaxes.
  if (candidates.length === 0 && constraints.promotion) {
    const relaxed = { ...constraints, promotion: undefined };
    candidates = legalMoves.filter((move) => matches(move, relaxed));
  }

  if (candidates.length === 0) {
    return { status: 'illegal', constraints, suggestions: suggestFor(legalMoves, constraints) };
  }

  if (candidates.length === 1) return { status: 'resolved', move: candidates[0]! };

  // 3. Same square, different promotion piece → that's a UI question, not an
  //    ambiguity about which piece moves.
  const first = candidates[0]!;
  const samePath = candidates.every((move) => move.from === first.from && move.to === first.to);
  if (samePath && candidates.every((move) => move.isPromotion())) {
    return { status: 'needs-promotion', from: first.from, to: first.to, candidates };
  }

  if (samePath) return { status: 'resolved', move: first };

  return { status: 'ambiguous', candidates };
}

function hasAnyConstraint(c: MoveConstraints): boolean {
  return Boolean(c.san || c.castle || c.from || c.to || c.fromFile || c.fromRank || c.piece);
}

function matches(move: Move, c: MoveConstraints): boolean {
  if (c.castle === 'kingside' && !move.isKingsideCastle()) return false;
  if (c.castle === 'queenside' && !move.isQueensideCastle()) return false;
  if (c.piece && move.piece !== c.piece) return false;
  if (c.from && move.from !== c.from) return false;
  if (c.fromFile && move.from[0] !== c.fromFile) return false;
  if (c.fromRank && move.from[1] !== c.fromRank) return false;
  if (c.to && move.to !== c.to) return false;
  if (c.promotion && move.promotion !== c.promotion) return false;
  if (c.capture === true && !move.isCapture()) return false;
  return true;
}

/**
 * When nothing matched, find the moves closest to what was asked for so the
 * app can answer with something better than "no".
 */
function suggestFor(legalMoves: Move[], c: MoveConstraints): Move[] {
  const byDestination = c.to ? legalMoves.filter((move) => move.to === c.to) : [];
  if (byDestination.length > 0) return byDestination.slice(0, 4);

  const byPiece = c.piece ? legalMoves.filter((move) => move.piece === c.piece) : [];
  if (byPiece.length > 0) return byPiece.slice(0, 4);

  const byOrigin = c.from ? legalMoves.filter((move) => move.from === c.from) : [];
  return byOrigin.slice(0, 4);
}

/** `O-O+` and `0-0` and `Nf3#` all collapse to a comparable form. */
export function canonicalSan(san: string): string {
  return san
    .replace(/0/g, 'O')
    .replace(/[+#]/g, '')
    .replace(/\s/g, '')
    .toLowerCase();
}

/**
 * Human label for one candidate in a clarifying question:
 * "the knight on b1", "the pawn on e2".
 */
export function describeCandidate(move: Move): string {
  return `the ${PIECE_NAMES[move.piece]} on ${move.from}`;
}

/**
 * Narrows an already-ambiguous candidate list using a follow-up utterance
 * ("the one on b1", "b1", "the knight"). Returns the remaining candidates.
 */
export function narrowCandidates(candidates: Move[], constraints: MoveConstraints): Move[] {
  const narrowed = candidates.filter((move) => matches(move, constraints));
  return narrowed.length > 0 ? narrowed : candidates;
}
