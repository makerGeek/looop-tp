import type { File, PieceSymbol, Rank, Square } from '@/chess/types';
import type { CommandName, MoveConstraints, ParsedUtterance, QuestionName, VoiceIntent } from './intents';
import { normalizeUtterance } from './normalize';

/**
 * An offline, deterministic parser for spoken chess.
 *
 * It runs *before* the language model on every utterance. Most of what people
 * say at a chessboard ("e4", "knight takes d5", "castle short", "take that
 * back") is a small, closed grammar — matching it locally is instant, free and
 * works on a plane. The model is only consulted when this parser shrugs.
 *
 * Crucially, a match here still produces nothing more than `MoveConstraints`.
 * Legality is decided later, by `resolveMove()` against `ChessGame`.
 */

const PIECE_LETTERS: Record<string, PieceSymbol> = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
};

const SAN_PIECE: Record<string, PieceSymbol> = { N: 'n', B: 'b', R: 'r', Q: 'q', K: 'k' };

// These are matched against *normalised* text: lower-case, apostrophe-free
// ("whats"), and with capture verbs folded onto "takes".
const COMMAND_PATTERNS: [RegExp, CommandName][] = [
  [/\b(undo|takes? (that|it) back|takes? back|takeback|oops|scratch that|never ?mind)\b/, 'undo'],
  [/\b(redo|put it back|replay that)\b/, 'redo'],
  [/\b(new game|start over|restart|reset the board|play again|rematch)\b/, 'new-game'],
  [/\b(i resign|resign|i give up|i quit)\b/, 'resign'],
  [/\b(offer (a )?draw|propose a draw|can we draw|lets draw)\b/, 'offer-draw'],
  [/\b(repeat|say (that )?again|what did you say|come again)\b/, 'repeat'],
  [/\b(flip( the)? board|rotate( the)? board|turn the board)\b/, 'flip-board'],
  [/\b(hint|suggest a move|what should i play|help me|any ideas)\b/, 'hint'],
  [/\b(stop listening|mute|be quiet|shush|stop talking)\b/, 'stop-listening'],
  [/\b(read (the )?moves|move list|read the game|what were the moves)\b/, 'read-moves'],
];

const QUESTION_PATTERNS: [RegExp, QuestionName][] = [
  [/\b(whats the position|hows the game|where are we|status|how does it look)\b/, 'position'],
  [/\b(whose (turn|move)|whos to (move|play)|is it my (turn|move))\b/, 'whose-turn'],
  [/\b(last move|what did (you|i) (just )?play|what was (that|the last move))\b/, 'last-move'],
  [/\b(material|am i (up|down)|whos (winning|ahead)|whats the score)\b/, 'material'],
  [/\b(what have i (taken|captured)|captured pieces|what did i take)\b/, 'captured'],
];

const AFFIRM = /^(yes|yeah|yep|yup|sure|correct|right|that one|do it|confirm|ok|okay|please do)\b/;
const DENY = /^(no|nope|nah|wrong|not that|cancel|stop|forget it)\b/;

export function parseWithGrammar(raw: string): ParsedUtterance {
  // Typed or model-supplied SAN is checked first, against the *raw* string, so
  // the capitalisation that distinguishes `Bd3` from `bd3` survives.
  const strictSan = matchStrictSan(raw.trim());
  if (strictSan) {
    return {
      normalized: raw.trim(),
      intent: { kind: 'move', constraints: strictSan },
      confidence: 0.95,
      source: 'grammar',
    };
  }

  const normalized = normalizeUtterance(raw);
  if (!normalized) {
    return { normalized, intent: { kind: 'unknown' }, confidence: 0, source: 'grammar' };
  }

  const intent = matchIntent(normalized);
  return {
    normalized,
    intent,
    confidence: intent.kind === 'unknown' ? 0 : confidenceFor(intent),
    source: 'grammar',
  };
}

function confidenceFor(intent: VoiceIntent): number {
  if (intent.kind !== 'move') return 0.95;
  const c = intent.constraints;
  // A fully-specified move ("e2 to e4") is as certain as the grammar gets; a
  // bare destination ("d4") is likely but leans on the resolver to disambiguate.
  if (c.castle || c.san) return 0.95;
  if (c.from && c.to) return 0.95;
  if (c.piece && c.to) return 0.9;
  return 0.75;
}

function matchIntent(text: string): VoiceIntent {
  // Order matters: commands and questions are checked first because a phrase
  // like "what should I play" contains no square and would otherwise fall
  // through to the (much looser) move patterns.
  for (const [pattern, command] of COMMAND_PATTERNS) {
    if (pattern.test(text)) return { kind: 'command', command };
  }

  const movesFrom = text.match(
    /\b(?:what (?:can|could)|where can|options for|moves? (?:for|from))\b[^a-h]*\b([a-h][1-8])\b/
  );
  if (movesFrom) {
    return { kind: 'question', question: 'moves-from', square: movesFrom[1] as Square };
  }

  for (const [pattern, question] of QUESTION_PATTERNS) {
    if (pattern.test(text)) return { kind: 'question', question };
  }

  if (AFFIRM.test(text)) return { kind: 'affirm' };
  if (DENY.test(text)) return { kind: 'deny' };

  const move = matchMove(text);
  return move ? { kind: 'move', constraints: move } : { kind: 'unknown' };
}

/** Extracts move constraints, or `null` when the text is not a move at all. */
export function matchMove(text: string): MoveConstraints | null {
  const castle = matchCastle(text);
  if (castle) return castle;

  const promotion = matchPromotion(text);
  const capture = /\btak(es|ing)\b/.test(text) ? true : undefined;

  const squares = [...text.matchAll(/\b([a-h][1-8])\b/g)].map((m) => m[1] as Square);
  const piece = matchPiece(text);

  // "e2 to e4", "knight b1 to c3", "b1 c3"
  if (squares.length >= 2) {
    const from = squares[squares.length - 2]!;
    const to = squares[squares.length - 1]!;
    return clean({ piece, from, to, capture, ...promotion });
  }

  if (squares.length === 1) {
    const to = squares[0]!;
    const origin = matchOrigin(text, to);
    return clean({ piece, to, capture, ...origin, ...promotion });
  }

  // "castle" handled above; without any square there is no move to describe.
  return null;
}

function matchCastle(text: string): MoveConstraints | null {
  if (!/\bcastles?\b/.test(text)) return null;
  if (/\b(queen ?side|long)\b/.test(text)) return { castle: 'queenside' };
  if (/\b(king ?side|short)\b/.test(text)) return { castle: 'kingside' };
  // Bare "castle" — the resolver reports it as ambiguous if both are legal.
  return {};
}

/**
 * Recognises a string that is *entirely* standard algebraic notation — what a
 * chess-literate user types and what the language model returns.
 *
 * The value is carried as a lookup key into the legal-move list, never as
 * evidence that the move exists: a bogus string simply matches nothing.
 */
export function matchStrictSan(text: string): MoveConstraints | null {
  if (/^(O-O-O|0-0-0)[+#]?$/.test(text)) return { castle: 'queenside' };
  if (/^(O-O|0-0)[+#]?$/.test(text)) return { castle: 'kingside' };

  const match = text.match(/^([NBRQK]?)([a-h]?[1-8]?)(x?)([a-h][1-8])(?:=([NBRQ]))?([+#]?)$/);
  if (!match) return null;

  const [, pieceLetter, , , , promotionLetter] = match;
  // A lone destination like `e4` is valid SAN, but so is almost any two-letter
  // utterance; let the constraint path own that case.
  if (!pieceLetter && !match[2] && !match[3]) return null;

  return clean({
    san: text,
    piece: pieceLetter ? SAN_PIECE[pieceLetter] : 'p',
    promotion: promotionLetter ? SAN_PIECE[promotionLetter] : undefined,
  });
}

function matchPiece(text: string): PieceSymbol | undefined {
  const match = text.match(/\b(pawn|knight|bishop|rook|queen|king)\b/);
  return match ? PIECE_LETTERS[match[1]!] : undefined;
}

/** "promote to a knight", "e8 queen", "promoting to rook". */
function matchPromotion(text: string): { promotion?: PieceSymbol } {
  const explicit = text.match(/\bpromot\w*\s+(?:to\s+)?(?:a\s+|an\s+|the\s+)?(queen|rook|bishop|knight)\b/);
  if (explicit) return { promotion: PIECE_LETTERS[explicit[1]!] };
  const trailing = text.match(/\b[a-h][18]\s+(?:equals\s+|=\s*)?(queen|rook|bishop|knight)\b/);
  if (trailing) return { promotion: PIECE_LETTERS[trailing[1]!] };
  return {};
}

/**
 * Origin hints that are not full squares: "the knight on b", "b takes c3",
 * "rook on the first rank".
 */
function matchOrigin(text: string, destination: Square): { fromFile?: File; fromRank?: Rank } {
  const result: { fromFile?: File; fromRank?: Rank } = {};

  // A bare file letter immediately before "takes" ("e takes d5") or after "on".
  const fileHint = text.match(/\b([a-h])\s+takes\b/) ?? text.match(/\bon(?: the)? ([a-h])\b(?!\d)/);
  if (fileHint) result.fromFile = fileHint[1] as File;

  const rankHint = text.match(/\bon(?: the)? ([1-8])(?:st|nd|rd|th)? rank\b/);
  if (rankHint) result.fromRank = rankHint[1] as Rank;

  // "the knight on b1" produces two squares and never reaches here, but
  // "the one on b1" does; guard against echoing the destination.
  const originSquare = text.match(/\bfrom ([a-h][1-8])\b/);
  if (originSquare && originSquare[1] !== destination) {
    result.fromFile = originSquare[1]![0] as File;
    result.fromRank = originSquare[1]![1] as Rank;
  }

  return result;
}

/** Drops `undefined` keys so equality checks and logs stay readable. */
function clean(constraints: MoveConstraints): MoveConstraints {
  return Object.fromEntries(
    Object.entries(constraints).filter(([, value]) => value !== undefined)
  ) as MoveConstraints;
}
