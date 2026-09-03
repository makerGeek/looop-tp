import type { Color, File, PieceSymbol, Rank, Square } from './types';

export const FILES: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS: Rank[] = ['1', '2', '3', '4', '5', '6', '7', '8'];

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

/** Centipawn-free, plain pawn units. Used for the material bar, not for search. */
export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const COLOR_NAMES: Record<Color, string> = { w: 'White', b: 'Black' };

export function isSquare(value: string): value is Square {
  return /^[a-h][1-8]$/.test(value);
}

export function fileOf(square: Square): File {
  return square[0] as File;
}

export function rankOf(square: Square): Rank {
  return square[1] as Rank;
}

/**
 * Converts a square to board coordinates in *render* space.
 *
 * `orientation` is the colour sitting at the bottom of the screen, so
 * `squareToXY('a1', 'w')` is the bottom-left corner and `squareToXY('a1', 'b')`
 * is the top-right one.
 */
export function squareToXY(square: Square, orientation: Color): { col: number; row: number } {
  const fileIndex = FILES.indexOf(fileOf(square));
  const rankIndex = RANKS.indexOf(rankOf(square));
  return orientation === 'w'
    ? { col: fileIndex, row: 7 - rankIndex }
    : { col: 7 - fileIndex, row: rankIndex };
}

export function xyToSquare(col: number, row: number, orientation: Color): Square | null {
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const fileIndex = orientation === 'w' ? col : 7 - col;
  const rankIndex = orientation === 'w' ? 7 - row : row;
  return `${FILES[fileIndex]}${RANKS[rankIndex]}` as Square;
}

/** `true` when the square is a light square, matching chess.js' own convention. */
export function isLightSquare(square: Square): boolean {
  const fileIndex = FILES.indexOf(fileOf(square));
  const rankIndex = RANKS.indexOf(rankOf(square));
  return (fileIndex + rankIndex) % 2 === 1;
}

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}
