import type { Color, Move, PieceSymbol, Square } from 'chess.js';

export type { Color, Move, PieceSymbol, Square };

export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

/** Which seat a human occupies. */
export type Seat = Color;

export type GameMode = 'cpu' | 'pass-and-play';

/** How a game ended. `null` while it is still running. */
export type GameResult =
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'stalemate' }
  | { kind: 'insufficient-material' }
  | { kind: 'threefold-repetition' }
  | { kind: 'fifty-move' }
  | { kind: 'resignation'; winner: Color }
  | { kind: 'draw-agreed' };

/** A move plus everything the UI and the narrator need, computed once. */
export interface MoveRecord {
  /** Standard algebraic notation, e.g. `Nf3`, `exd5`, `O-O`, `e8=Q+`. */
  san: string;
  /** Long algebraic, e.g. `g1f3`. This is what UCI engines speak. */
  lan: string;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  color: Color;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  isCapture: boolean;
  isEnPassant: boolean;
  isCastle: boolean;
  isKingsideCastle: boolean;
  isPromotion: boolean;
  /** FEN before the move was made. */
  before: string;
  /** FEN after the move was made. */
  after: string;
  /** State of the position *after* the move. */
  givesCheck: boolean;
  givesCheckmate: boolean;
  /** Full-move number this move belongs to (1-indexed, as in PGN). */
  moveNumber: number;
}

/** Snapshot of a position — everything a renderer needs, nothing it doesn't. */
export interface PositionSnapshot {
  fen: string;
  turn: Color;
  board: ({ square: Square; type: PieceSymbol; color: Color } | null)[][];
  inCheck: boolean;
  isGameOver: boolean;
  result: GameResult | null;
  legalMoves: Move[];
  history: MoveRecord[];
  /** Pieces captured by each side, most valuable first. */
  captured: Record<Color, PieceSymbol[]>;
  /** Positive means White is ahead by that many pawns of material. */
  materialBalance: number;
}
