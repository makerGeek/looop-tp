import type { File, PieceSymbol, Rank, Square } from '@/chess/types';

/**
 * A *description* of a move, never a decision that one is legal.
 *
 * Both the offline grammar and the language model produce values of this type.
 * `resolveMove()` is what turns a description into an actual move, and it does
 * so by filtering the legal-move list that `ChessGame` produces. If a field is
 * absent it simply means "unconstrained".
 */
export interface MoveConstraints {
  piece?: PieceSymbol;
  from?: Square;
  fromFile?: File;
  fromRank?: Rank;
  to?: Square;
  promotion?: PieceSymbol;
  /** `true` = the speaker said "takes"/"captures"; `undefined` = didn't say. */
  capture?: boolean;
  castle?: 'kingside' | 'queenside';
  /**
   * SAN exactly as heard. Treated as a *lookup key* into the legal move list —
   * never as evidence that the move exists.
   */
  san?: string;
}

export type CommandName =
  | 'undo'
  | 'redo'
  | 'new-game'
  | 'resign'
  | 'offer-draw'
  | 'repeat'
  | 'flip-board'
  | 'hint'
  | 'stop-listening'
  | 'read-moves';

export type QuestionName =
  | 'position'
  | 'whose-turn'
  | 'last-move'
  | 'material'
  | 'moves-from'
  | 'captured';

export type VoiceIntent =
  | { kind: 'move'; constraints: MoveConstraints }
  | { kind: 'command'; command: CommandName }
  | { kind: 'question'; question: QuestionName; square?: Square }
  | { kind: 'affirm' }
  | { kind: 'deny' }
  | { kind: 'unknown' };

export interface ParsedUtterance {
  /** The transcript the intent was derived from, after normalisation. */
  normalized: string;
  intent: VoiceIntent;
  /** Rough 0–1 confidence. The grammar is confident; the model less so. */
  confidence: number;
  source: 'grammar' | 'llm' | 'clarification';
}

export const UNKNOWN_UTTERANCE: ParsedUtterance = {
  normalized: '',
  intent: { kind: 'unknown' },
  confidence: 0,
  source: 'grammar',
};
