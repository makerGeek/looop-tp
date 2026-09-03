/**
 * Speech-to-text output is messy in very predictable ways: "knight" comes back
 * as "night", "b4" as "be four", "e4" as "eat for". This module folds those
 * variations into a canonical string that the grammar can match against.
 *
 * It is pure, synchronous and dependency-free so it can run on every keystroke
 * of the type-a-move fallback as well as on transcripts.
 */

const NUMBER_WORDS: Record<string, string> = {
  one: '1',
  won: '1',
  two: '2',
  too: '2',
  three: '3',
  tree: '3',
  four: '4',
  for: '4',
  fore: '4',
  five: '5',
  six: '6',
  sicks: '6',
  seven: '7',
  eight: '8',
  ate: '8',
};

/** Words that are unambiguously a file letter when they sit next to a rank. */
const FILE_WORDS: Record<string, string> = {
  alpha: 'a',
  ay: 'a',
  eh: 'a',
  bravo: 'b',
  bee: 'b',
  be: 'b',
  charlie: 'c',
  see: 'c',
  sea: 'c',
  cee: 'c',
  delta: 'd',
  dee: 'd',
  echo: 'e',
  ee: 'e',
  foxtrot: 'f',
  eff: 'f',
  ef: 'f',
  golf: 'g',
  gee: 'g',
  jee: 'g',
  hotel: 'h',
  aitch: 'h',
  aych: 'h',
};

/** Mishearings of the piece names, mapped to the canonical word. */
const PIECE_WORDS: Record<string, string> = {
  night: 'knight',
  nite: 'knight',
  knights: 'knight',
  nights: 'knight',
  horse: 'knight',
  bishops: 'bishop',
  bishop: 'bishop',
  rook: 'rook',
  rooks: 'rook',
  rock: 'rook',
  rocks: 'rook',
  ruck: 'rook',
  castleking: 'rook',
  tower: 'rook',
  queens: 'queen',
  quean: 'queen',
  kings: 'king',
  pawns: 'pawn',
  pon: 'pawn',
  porn: 'pawn',
  prawn: 'pawn',
  pond: 'pawn',
};

/**
 * Capture verbs, folded onto "takes".
 *
 * "take" and "taking" are deliberately *not* folded: "take that back" is an
 * undo, and rewriting it to "takes that back" would hide the command behind
 * the capture grammar.
 */
const VERB_WORDS: Record<string, string> = {
  captures: 'takes',
  capture: 'takes',
  capturing: 'takes',
  eats: 'takes',
  x: 'takes',
};

/**
 * Normalises a raw transcript.
 *
 * The output is lower-case, punctuation-free, and has coordinates glued
 * together: "knight to eff three" → "knight to f3".
 */
export function normalizeUtterance(raw: string): string {
  let text = raw
    .toLowerCase()
    // Apostrophes are removed rather than spaced out, so "what's" collapses to
    // the single token "whats" that the patterns below expect.
    .replace(/['’`]/g, '')
    .replace(/[.,!?;:"]/g, ' ')
    .replace(/\bo-o-o\b/g, ' queenside castle ')
    .replace(/\bo-o\b/g, ' kingside castle ')
    .replace(/\b0-0-0\b/g, ' queenside castle ')
    .replace(/\b0-0\b/g, ' kingside castle ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // "e2 x e4" / "exe4" style capture markers.
  text = text.replace(/([a-h][1-8]?)\s*x\s*([a-h][1-8])/g, '$1 takes $2');

  let words = text.split(' ').filter(Boolean);

  words = words.map((word) => PIECE_WORDS[word] ?? VERB_WORDS[word] ?? word);

  words = joinFileRank(words);

  // Number words that survived joining (e.g. "rank four") become digits.
  words = words.map((word) => NUMBER_WORDS[word] ?? word);

  return words.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Glues a file token and a rank token into one square token.
 *
 * Handles "e 4", "e four", "eff four", "echo 4" and the already-joined "e4".
 * The preposition "to" is deliberately never read as the number two — losing
 * "knight to f3" would cost far more than gaining "e to e4".
 */
function joinFileRank(words: string[]): string[] {
  const out: string[] = [];

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]!;

    // Already a full square or a run of squares like "e2e4".
    if (/^[a-h][1-8]$/.test(word)) {
      out.push(word);
      continue;
    }
    if (/^[a-h][1-8][a-h][1-8]$/.test(word)) {
      out.push(word.slice(0, 2), word.slice(2));
      continue;
    }

    const file = toFile(word);
    if (file) {
      const nextRaw = words[i + 1];
      const rank = nextRaw ? toRank(nextRaw) : null;
      if (rank) {
        out.push(`${file}${rank}`);
        i += 1;
        continue;
      }
      // A bare file letter is meaningful too ("e takes d5"), keep it.
      out.push(file);
      continue;
    }

    out.push(word);
  }

  return out;
}

function toFile(word: string): string | null {
  if (/^[a-h]$/.test(word)) return word;
  return FILE_WORDS[word] ?? null;
}

function toRank(word: string): string | null {
  if (/^[1-8]$/.test(word)) return word;
  const digit = NUMBER_WORDS[word];
  return digit && /^[1-8]$/.test(digit) ? digit : null;
}
