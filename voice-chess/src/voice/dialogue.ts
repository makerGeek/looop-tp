import { PIECE_NAMES } from '@/chess/board';
import { listPhrase } from '@/chess/narration';
import type { Move } from '@/chess/types';
import type { MoveConstraints } from './intents';
import { describeCandidate } from './resolve';

/**
 * The app's half of the conversation.
 *
 * Everything here is short, specific and never scolds. When the app can't act
 * it says what it *can* do next — a clarifying question with real options
 * beats "sorry, I didn't understand" every time.
 */

export function clarifyAmbiguous(candidates: Move[]): string {
  const unique = [...new Set(candidates.map((move) => move.piece))];
  if (unique.length === 1) {
    const options = candidates.slice(0, 4).map((move) => move.from);
    return `Which ${PIECE_NAMES[unique[0]!]} — the one on ${listPhrase(options)}?`;
  }
  return `Which one — ${listPhrase(candidates.slice(0, 4).map(describeCandidate))}?`;
}

export function clarifyPromotion(to: string): string {
  return `Promoting on ${to} — queen, rook, bishop or knight?`;
}

export function clarifyCastleSide(): string {
  return 'Kingside or queenside?';
}

export function rejectIllegal(constraints: MoveConstraints, suggestions: Move[]): string {
  const target = constraints.to;
  const pieceWord = constraints.piece ? PIECE_NAMES[constraints.piece] : 'piece';

  let opener: string;
  if (constraints.capture && target) {
    opener = `There's nothing to take on ${target}.`;
  } else if (target && constraints.piece) {
    opener = `No ${pieceWord} can reach ${target} right now.`;
  } else if (target) {
    opener = `${target} isn't available.`;
  } else {
    opener = "That move isn't legal here.";
  }

  if (suggestions.length === 0) return opener;
  const sans = suggestions.slice(0, 3).map((move) => move.san);
  return `${opener} You could play ${listPhrase(sans)}.`;
}

export function didNotUnderstand(): string {
  const options = [
    "I didn't catch that. Try something like “knight to f3”.",
    "Sorry, I missed that. You can say a square, like “e4”.",
    'Didn’t get that one. Name the piece and the square, for example “bishop c4”.',
  ];
  return options[Math.floor(Math.random() * options.length)]!;
}

export function notYourTurn(): string {
  return 'Hold on — it’s not your move yet.';
}

export function gameAlreadyOver(): string {
  return 'This game is finished. Say “new game” to start another.';
}

export function nothingToUndo(): string {
  return 'There’s nothing to take back yet.';
}

export function acknowledgeUndo(count: number): string {
  return count > 1 ? 'Taken back.' : 'Taken back — your move again.';
}

export function greeting(opponentLabel: string, playerIsWhite: boolean): string {
  return playerIsWhite
    ? `You're White against ${opponentLabel}. Your move — just say it.`
    : `You're Black against ${opponentLabel}. I'll open.`;
}

export function hintPhrase(move: Move): string {
  return `I'd look at ${move.san}.`;
}

export function listeningPrompt(): string {
  return 'Listening…';
}
