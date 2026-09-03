import { COLOR_NAMES, PIECE_NAMES, fileOf, rankOf } from './board';
import type { Color, GameResult, MoveRecord, PieceSymbol, PositionSnapshot, Square } from './types';

/**
 * Turns chess facts into sentences a person would actually say.
 *
 * Two rules shape everything here:
 *   1. Be short. Spoken feedback that runs long stops feeling like a partner
 *      and starts feeling like a screen reader.
 *   2. Never editorialise about legality — by the time narration runs, the move
 *      is already a fact produced by `ChessGame`.
 */

/** Deterministic in tests, varied in play. */
function pick<T>(options: readonly T[], seed?: number): T {
  const index =
    seed === undefined
      ? Math.floor(Math.random() * options.length)
      : Math.abs(Math.trunc(seed)) % options.length;
  return options[index]!;
}

/** `e4` → `e4`, but `a1` → `a1` — kept as a hook for locale/phonetic tweaks. */
export function speakSquare(square: Square): string {
  return `${fileOf(square)}${rankOf(square)}`;
}

export function pieceName(piece: PieceSymbol): string {
  return PIECE_NAMES[piece];
}

/**
 * The core of the narrator: a single move as a short spoken phrase.
 *
 * `Nf3`  → "Knight to f3"
 * `exd5` → "Pawn takes d5"
 * `O-O`  → "Castles kingside"
 * `e8=Q+`→ "Pawn to e8, promotes to queen. Check."
 */
export function describeMove(move: MoveRecord, options: { seed?: number } = {}): string {
  const parts: string[] = [];

  if (move.isCastle) {
    parts.push(move.isKingsideCastle ? 'Castles kingside' : 'Castles queenside');
  } else if (move.isCapture) {
    const taker = pieceName(move.piece);
    const takenSuffix = move.isEnPassant ? ' en passant' : '';
    parts.push(`${capitalise(taker)} takes on ${speakSquare(move.to)}${takenSuffix}`);
  } else {
    parts.push(`${capitalise(pieceName(move.piece))} to ${speakSquare(move.to)}`);
  }

  if (move.isPromotion && move.promotion) {
    parts.push(`promotes to ${pieceName(move.promotion)}`);
  }

  let sentence = parts.join(', ') + '.';

  if (move.givesCheckmate) {
    sentence += ' Checkmate.';
  } else if (move.givesCheck) {
    sentence += ` ${pick(['Check.', 'Check!', "That's check."], options.seed)}`;
  }

  return sentence;
}

/** What the app says right after the player's own move lands. */
export function confirmPlayerMove(move: MoveRecord, seed?: number): string {
  if (move.givesCheckmate) return `${describeMove(move)} You win.`;
  const lead = pick(['', '', 'Got it. ', 'Okay. '], seed);
  return `${lead}${describeMove(move, { seed })}`.trim();
}

/** What the app says when the CPU (or the other seat) replies. */
export function announceOpponentMove(move: MoveRecord, opponentLabel: string, seed?: number): string {
  const lead = pick([`${opponentLabel} plays`, `${opponentLabel} answers`, `${opponentLabel} goes`], seed);
  return `${lead} ${lowerFirst(describeMove(move, { seed }))}`;
}

export function describeResult(result: GameResult): string {
  switch (result.kind) {
    case 'checkmate':
      return `Checkmate. ${COLOR_NAMES[result.winner]} wins.`;
    case 'stalemate':
      return 'Stalemate. The game is a draw.';
    case 'insufficient-material':
      return 'Draw — neither side has enough material to mate.';
    case 'threefold-repetition':
      return 'Draw by threefold repetition.';
    case 'fifty-move':
      return 'Draw by the fifty-move rule.';
    case 'resignation':
      return `${COLOR_NAMES[result.winner]} wins by resignation.`;
    case 'draw-agreed':
      return 'Draw agreed.';
  }
}

/** Short status line for the header, e.g. "White to move · check". */
export function describeStatus(snapshot: PositionSnapshot): string {
  if (snapshot.result) return describeResult(snapshot.result);
  const side = COLOR_NAMES[snapshot.turn];
  return snapshot.inCheck ? `${side} to move — in check` : `${side} to move`;
}

/** Spoken answer to "what's the position?" */
export function describePosition(snapshot: PositionSnapshot, seat: Color): string {
  if (snapshot.result) return describeResult(snapshot.result);

  const last = snapshot.history[snapshot.history.length - 1];
  const lastPart = last ? `Last move was ${lowerFirst(describeMove(last))} ` : '';
  const turnPart =
    snapshot.turn === seat ? "It's your move." : `${COLOR_NAMES[snapshot.turn]} is thinking.`;

  const balance = seat === 'w' ? snapshot.materialBalance : -snapshot.materialBalance;
  let materialPart = '';
  if (balance > 0) materialPart = ` You're up ${describePawns(balance)}.`;
  else if (balance < 0) materialPart = ` You're down ${describePawns(-balance)}.`;

  const checkPart = snapshot.inCheck ? ' Careful — there is a check on the board.' : '';

  return `${lastPart}${turnPart}${materialPart}${checkPart}`.trim();
}

function describePawns(value: number): string {
  return value === 1 ? 'a pawn' : `${value} points of material`;
}

/** Spoken answer to "what can my knight do?" style questions. */
export function describeMovesFrom(square: Square, sans: string[]): string {
  if (sans.length === 0) return `Nothing on ${speakSquare(square)} can move right now.`;
  if (sans.length === 1) return `Only ${sans[0]} from ${speakSquare(square)}.`;
  return `From ${speakSquare(square)} you have ${listPhrase(sans)}.`;
}

/** "a, b and c" — the Oxford-comma-free version people say out loud. */
export function listPhrase(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, or ${items[items.length - 1]}`;
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
