import type { PositionSnapshot } from '@/chess/types';
import type { CommandName, MoveConstraints, ParsedUtterance, QuestionName, VoiceIntent } from './intents';
import { postJson, type OpenAIConfig } from './openaiClient';

/**
 * Language-model understanding of a spoken utterance.
 *
 * ## The one rule
 * The model is asked to *describe* what it heard — a piece, an origin hint, a
 * destination square — and never to decide what is playable. It is not given
 * permission to invent a move, and the schema below gives it no way to express
 * "this move is legal". Its output goes straight into `resolveMove()`, which
 * intersects it with the legal-move list from `ChessGame`. If the model
 * hallucinates `Qh7#` in a position where the queen is pinned, the intersection
 * is empty and the player hears a clarifying question — the illegal move can
 * never reach the board.
 *
 * We *do* hand the model the list of legal moves, but purely as grounding for
 * ambiguity ("the knight" when only one knight can move). It is context, not
 * authority.
 */

const SYSTEM_PROMPT = `You interpret spoken chess for a voice-controlled chess app.

Your job is to DESCRIBE what the player said. You must never judge whether a move is legal, and you must never invent a move the player did not say. Another component checks legality against the real rules.

Return the structured fields that the player actually specified and leave everything else null:
- piece: the piece they named (pawn/knight/bishop/rook/queen/king), if any.
- from / fromFile / fromRank: origin information, if they gave any.
- to: the destination square, if they named one.
- promotion: the promotion piece, if they named one.
- capture: true only if they said takes/captures.
- castle: "kingside" or "queenside" only if they said so.
- san: only if they clearly spoke standard algebraic notation.

If the utterance is a command (undo, new game, resign, offer draw, repeat, flip board, hint, stop listening, read moves) return kind "command".
If it is a question about the game (position, whose turn, last move, material, moves from a square, captured pieces) return kind "question".
If it is a yes/no answer to a clarifying question, return kind "affirm" or "deny".
If you cannot tell, return kind "unknown". Guessing is worse than admitting you didn't catch it.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'move', 'command', 'question', 'square', 'confidence'],
  properties: {
    kind: { type: 'string', enum: ['move', 'command', 'question', 'affirm', 'deny', 'unknown'] },
    move: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['piece', 'from', 'fromFile', 'fromRank', 'to', 'promotion', 'capture', 'castle', 'san'],
      properties: {
        piece: { type: ['string', 'null'], enum: ['p', 'n', 'b', 'r', 'q', 'k', null] },
        from: { type: ['string', 'null'] },
        fromFile: { type: ['string', 'null'] },
        fromRank: { type: ['string', 'null'] },
        to: { type: ['string', 'null'] },
        promotion: { type: ['string', 'null'], enum: ['q', 'r', 'b', 'n', null] },
        capture: { type: ['boolean', 'null'] },
        castle: { type: ['string', 'null'], enum: ['kingside', 'queenside', null] },
        san: { type: ['string', 'null'] },
      },
    },
    command: {
      type: ['string', 'null'],
      enum: [
        'undo',
        'redo',
        'new-game',
        'resign',
        'offer-draw',
        'repeat',
        'flip-board',
        'hint',
        'stop-listening',
        'read-moves',
        null,
      ],
    },
    question: {
      type: ['string', 'null'],
      enum: ['position', 'whose-turn', 'last-move', 'material', 'moves-from', 'captured', null],
    },
    square: { type: ['string', 'null'] },
    confidence: { type: 'number' },
  },
} as const;

interface RawResponse {
  kind: 'move' | 'command' | 'question' | 'affirm' | 'deny' | 'unknown';
  move: Record<string, unknown> | null;
  command: CommandName | null;
  question: QuestionName | null;
  square: string | null;
  confidence: number;
}

export interface NluOptions {
  model: string;
  signal?: AbortSignal;
  /** Candidate moves from a pending clarifying question, if there is one. */
  pendingCandidates?: string[];
}

export async function parseWithModel(
  config: OpenAIConfig,
  transcript: string,
  snapshot: PositionSnapshot,
  options: NluOptions
): Promise<ParsedUtterance> {
  const response = await postJson<{ choices: { message: { content: string } }[] }>(
    config,
    '/chat/completions',
    {
      model: options.model,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildContext(snapshot, options.pendingCandidates) },
        { role: 'user', content: `The player said: "${transcript}"` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'chess_utterance', strict: true, schema: RESPONSE_SCHEMA },
      },
    },
    { signal: options.signal }
  );

  const parsed = safeParse(response.choices?.[0]?.message?.content ?? '{}');
  return {
    normalized: transcript,
    intent: toIntent(parsed),
    confidence: clamp(parsed.confidence ?? 0.6),
    source: 'llm',
  };
}

/**
 * Context for the model. Deliberately factual: the position, whose turn it is,
 * and the legal moves as *grounding*. No instruction here asks the model to
 * choose, rank or validate anything.
 */
function buildContext(snapshot: PositionSnapshot, pendingCandidates?: string[]): string {
  const legal = snapshot.legalMoves.map((move) => `${move.san} (${move.from}${move.to})`).join(', ');
  const lines = [
    `FEN: ${snapshot.fen}`,
    `Side to move: ${snapshot.turn === 'w' ? 'White' : 'Black'}`,
    `Legal moves right now (for grounding only — do not pick one unless the player named it): ${legal}`,
  ];
  if (pendingCandidates?.length) {
    lines.push(
      `The app just asked the player to choose between: ${pendingCandidates.join(', ')}. Their reply is probably narrowing that choice.`
    );
  }
  return lines.join('\n');
}

function toIntent(raw: Partial<RawResponse>): VoiceIntent {
  switch (raw.kind) {
    case 'move':
      return { kind: 'move', constraints: sanitizeConstraints(raw.move ?? {}) };
    case 'command':
      return raw.command ? { kind: 'command', command: raw.command } : { kind: 'unknown' };
    case 'question':
      return raw.question
        ? {
            kind: 'question',
            question: raw.question,
            square: isSquareString(raw.square) ? raw.square : undefined,
          }
        : { kind: 'unknown' };
    case 'affirm':
      return { kind: 'affirm' };
    case 'deny':
      return { kind: 'deny' };
    default:
      return { kind: 'unknown' };
  }
}

/**
 * Defensive normalisation of model output.
 *
 * Anything malformed is dropped rather than repaired — a partially-understood
 * utterance that produces a clarifying question is a much better outcome than a
 * confidently wrong one.
 */
export function sanitizeConstraints(raw: Record<string, unknown>): MoveConstraints {
  const result: MoveConstraints = {};

  if (isPieceString(raw.piece)) result.piece = raw.piece;
  if (isSquareString(raw.from)) result.from = raw.from;
  if (isSquareString(raw.to)) result.to = raw.to;
  if (isFileString(raw.fromFile)) result.fromFile = raw.fromFile;
  if (isRankString(raw.fromRank)) result.fromRank = raw.fromRank;
  if (isPromotionString(raw.promotion)) result.promotion = raw.promotion;
  if (raw.capture === true) result.capture = true;
  if (raw.castle === 'kingside' || raw.castle === 'queenside') result.castle = raw.castle;
  if (typeof raw.san === 'string' && raw.san.length > 0 && raw.san.length <= 8) result.san = raw.san;

  return result;
}

function isSquareString(value: unknown): value is import('@/chess/types').Square {
  return typeof value === 'string' && /^[a-h][1-8]$/.test(value);
}

function isFileString(value: unknown): value is import('@/chess/types').File {
  return typeof value === 'string' && /^[a-h]$/.test(value);
}

function isRankString(value: unknown): value is import('@/chess/types').Rank {
  return typeof value === 'string' && /^[1-8]$/.test(value);
}

function isPieceString(value: unknown): value is import('@/chess/types').PieceSymbol {
  return typeof value === 'string' && /^[pnbrqk]$/.test(value);
}

function isPromotionString(value: unknown): value is import('@/chess/types').PieceSymbol {
  return typeof value === 'string' && /^[qrbn]$/.test(value);
}

function safeParse(content: string): Partial<RawResponse> {
  try {
    return JSON.parse(content) as Partial<RawResponse>;
  } catch {
    return {};
  }
}

function clamp(value: number): number {
  if (Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}
