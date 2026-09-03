import type { Move, PieceSymbol, PositionSnapshot, Square } from '@/chess/types';
import type { PendingClarification } from '@/state/gameStore';
import * as dialogue from './dialogue';
import type { CommandName, MoveConstraints, ParsedUtterance, QuestionName } from './intents';
import { narrowCandidates, resolveMove } from './resolve';

/**
 * Turns a parsed utterance into a decision, without performing any of it.
 *
 * Keeping this pure is what makes the conversation testable: the interesting
 * behaviour (clarifying questions, follow-up answers, refusing to move out of
 * turn) is exercised in `interpret.test.ts` with no audio, no network and no
 * renderer. The hook that calls this owns all the side effects.
 */

export type VoiceOutcome =
  /** A single legal move was identified. */
  | { kind: 'move'; move: Move }
  /** Legal move, but the promotion piece is still unknown. */
  | { kind: 'promotion'; from: Square; to: Square; speech: string }
  /** More than one legal move fits — ask. */
  | { kind: 'clarify'; clarification: PendingClarification; speech: string }
  | { kind: 'command'; command: CommandName }
  | { kind: 'question'; question: QuestionName; square?: Square }
  /** Understood, but can't be done. `speech` explains why, kindly. */
  | { kind: 'reject'; speech: string }
  /** Nothing actionable was heard. */
  | { kind: 'unheard'; speech: string };

export interface InterpretContext {
  snapshot: PositionSnapshot;
  /** `false` while the CPU is thinking or during the other seat's turn. */
  isPlayersTurn: boolean;
  isGameOver: boolean;
  pendingClarification: PendingClarification | null;
}

const PROMOTION_WORDS: Record<string, PieceSymbol> = {
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
};

export function interpretUtterance(parsed: ParsedUtterance, context: InterpretContext): VoiceOutcome {
  const { intent } = parsed;

  // Commands and questions work at any time, including after the game ends —
  // "new game" has to be reachable from a finished board.
  if (intent.kind === 'command') return { kind: 'command', command: intent.command };
  if (intent.kind === 'question') {
    return { kind: 'question', question: intent.question, square: intent.square };
  }

  if (context.pendingClarification) {
    const answered = answerClarification(parsed, context.pendingClarification, context);
    if (answered) return answered;
  }

  if (intent.kind === 'unknown') return { kind: 'unheard', speech: dialogue.didNotUnderstand() };
  if (intent.kind === 'affirm' || intent.kind === 'deny') {
    return { kind: 'unheard', speech: dialogue.didNotUnderstand() };
  }

  if (context.isGameOver) return { kind: 'reject', speech: dialogue.gameAlreadyOver() };
  if (!context.isPlayersTurn) return { kind: 'reject', speech: dialogue.notYourTurn() };

  return resolveToOutcome(intent.constraints, context.snapshot.legalMoves);
}

function resolveToOutcome(constraints: MoveConstraints, legalMoves: Move[]): VoiceOutcome {
  const resolution = resolveMove(legalMoves, constraints);

  switch (resolution.status) {
    case 'resolved':
      return { kind: 'move', move: resolution.move };

    case 'needs-promotion':
      return {
        kind: 'promotion',
        from: resolution.from,
        to: resolution.to,
        speech: dialogue.clarifyPromotion(resolution.to),
      };

    case 'ambiguous':
      return {
        kind: 'clarify',
        clarification: {
          kind: 'ambiguous',
          question: dialogue.clarifyAmbiguous(resolution.candidates),
          candidates: resolution.candidates,
          constraints,
        },
        speech: dialogue.clarifyAmbiguous(resolution.candidates),
      };

    case 'illegal':
      return { kind: 'reject', speech: dialogue.rejectIllegal(constraints, resolution.suggestions) };

    case 'empty':
      return { kind: 'unheard', speech: dialogue.didNotUnderstand() };
  }
}

/**
 * Interprets a reply to the app's own question.
 *
 * Answers here are usually fragments — "the one on b1", "queen", "b1" — which
 * carry no move on their own, so they are matched against the candidates the
 * question was asked about rather than against the whole position.
 */
function answerClarification(
  parsed: ParsedUtterance,
  pending: PendingClarification,
  context: InterpretContext
): VoiceOutcome | null {
  const { intent, normalized } = parsed;

  if (intent.kind === 'deny') {
    return { kind: 'reject', speech: 'Okay, forget that one. What would you like to play?' };
  }

  if (pending.kind === 'promotion') {
    const promotion = findPromotionWord(normalized);
    if (!promotion) return null;
    const match = pending.candidates.find((move) => move.promotion === promotion);
    return match
      ? { kind: 'move', move: match }
      : { kind: 'reject', speech: dialogue.clarifyPromotion(pending.candidates[0]?.to ?? '') };
  }

  // A bare square or file narrows the candidate list.
  const spoken: MoveConstraints =
    intent.kind === 'move' ? intent.constraints : constraintsFromFragment(normalized);
  const constraints = asOriginHint(spoken, pending.candidates);
  if (!hasNarrowingInfo(constraints)) return null;

  const narrowed = narrowCandidates(pending.candidates, {
    ...constraints,
    // The destination was already agreed when the question was asked; a
    // follow-up almost always names the *origin*.
    to: pending.constraints.to ?? constraints.to,
  });

  if (narrowed.length === 1) return { kind: 'move', move: narrowed[0]! };
  if (narrowed.length === pending.candidates.length) return null;

  return {
    kind: 'clarify',
    clarification: { ...pending, candidates: narrowed, question: dialogue.clarifyAmbiguous(narrowed) },
    speech: dialogue.clarifyAmbiguous(narrowed),
  };
}

/** Pulls origin hints out of a fragment like "the one on b1" or "the g one". */
export function constraintsFromFragment(normalized: string): MoveConstraints {
  const square = normalized.match(/\b([a-h][1-8])\b/);
  if (square) return { from: square[1] as Square };

  const piece = normalized.match(/\b(pawn|knight|bishop|rook|queen|king)\b/);
  if (piece) {
    const map: Record<string, PieceSymbol> = {
      pawn: 'p',
      knight: 'n',
      bishop: 'b',
      rook: 'r',
      queen: 'q',
      king: 'k',
    };
    return { piece: map[piece[1]!] };
  }

  const file = normalized.match(/\b(?:the )?([a-h]) (?:one|file|pawn)\b/);
  if (file) return { fromFile: file[1] as MoveConstraints['fromFile'] };

  return {};
}

/**
 * Re-reads a bare square as an *origin* when answering "which one?".
 *
 * Standing alone, "c3" means "move something to c3". Said in reply to "which
 * knight — the one on c3 or e3?", it plainly means the knight on c3. The
 * rewrite only happens when the square is actually one of the candidates'
 * origins, so an unrelated move said mid-question still means what it says.
 */
export function asOriginHint(constraints: MoveConstraints, candidates: Move[]): MoveConstraints {
  if (!constraints.to || constraints.from || constraints.fromFile || constraints.fromRank) {
    return constraints;
  }
  if (!candidates.some((move) => move.from === constraints.to)) return constraints;

  const { to, ...rest } = constraints;
  return { ...rest, from: to };
}

function hasNarrowingInfo(constraints: MoveConstraints): boolean {
  return Boolean(constraints.from || constraints.fromFile || constraints.fromRank || constraints.piece);
}

function findPromotionWord(normalized: string): PieceSymbol | null {
  const match = normalized.match(/\b(queen|rook|bishop|knight)\b/);
  return match ? PROMOTION_WORDS[match[1]!]! : null;
}

export { dialogue };
