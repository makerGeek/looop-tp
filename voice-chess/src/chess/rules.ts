import { Chess } from 'chess.js';

import { PIECE_VALUES, opposite } from './board';
import type {
  Color,
  GameResult,
  Move,
  MoveRecord,
  PieceSymbol,
  PositionSnapshot,
  Square,
} from './types';

/**
 * `ChessGame` is the ONLY place in this app that decides what a legal move is.
 *
 * Nothing else — not the speech recogniser, not the language model, not the UI
 * — is allowed to assert that a move is playable. Everything upstream produces
 * *candidate descriptions*; this class turns a description into a real move or
 * rejects it. See `docs/architecture.md` for why that boundary matters.
 */
export class ChessGame {
  private chess: Chess;
  /** Moves undone by the player, kept so `redo()` can replay them. */
  private redoStack: string[] = [];

  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  static fromFen(fen: string): ChessGame {
    return new ChessGame(fen);
  }

  /** Rebuilds a game from PGN. Returns `null` when the PGN can't be replayed. */
  static fromPgn(pgn: string): ChessGame | null {
    const game = new ChessGame();
    try {
      game.chess.loadPgn(pgn);
      return game;
    } catch {
      return null;
    }
  }

  /** Deep copy — used by the engine adapters and by search without side effects. */
  clone(): ChessGame {
    const copy = new ChessGame();
    copy.chess = new Chess(this.chess.fen());
    return copy;
  }

  get fen(): string {
    return this.chess.fen();
  }

  get turn(): Color {
    return this.chess.turn();
  }

  get pgn(): string {
    return this.chess.pgn();
  }

  /** Every legal move in the current position, in verbose form. */
  legalMoves(): Move[] {
    return this.chess.moves({ verbose: true });
  }

  legalMovesFrom(square: Square): Move[] {
    return this.chess.moves({ square, verbose: true });
  }

  pieceAt(square: Square) {
    return this.chess.get(square) ?? null;
  }

  inCheck(): boolean {
    return this.chess.inCheck();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  /** Square the side-to-move's king stands on, or `null` if there isn't one. */
  kingSquare(color: Color = this.turn): Square | null {
    return this.chess.findPiece({ type: 'k', color })[0] ?? null;
  }

  /**
   * Attempts a move. Returns `null` when the move is not legal — this method
   * never throws, so callers can treat "illegal" as ordinary control flow.
   */
  tryMove(input: string | { from: Square; to: Square; promotion?: PieceSymbol }): MoveRecord | null {
    try {
      const move = this.chess.move(input as never);
      this.redoStack = [];
      return this.describe(move);
    } catch {
      return null;
    }
  }

  /** Takes back the last move. Returns the move that was undone. */
  undo(): MoveRecord | null {
    const undone = this.chess.undo();
    if (!undone) return null;
    this.redoStack.push(undone.san);
    // Describe against the position the move produced, so `givesCheck` on the
    // returned record still refers to the move itself and not to the position
    // we just rewound to.
    return describeWith(new Chess(undone.after), undone);
  }

  /** Replays the most recently undone move, if any. */
  redo(): MoveRecord | null {
    const san = this.redoStack.pop();
    if (!san) return null;
    try {
      return this.describe(this.chess.move(san));
    } catch {
      return null;
    }
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  history(): MoveRecord[] {
    // Replaying is the only way to know whether each move gave check, so we
    // walk the game forward from wherever it actually began — which is not
    // necessarily the standard start, since a game can be built from a FEN.
    const moves = this.chess.history({ verbose: true });
    if (moves.length === 0) return [];

    const replay = new Chess(moves[0]!.before);
    return moves.map((move) => describeWith(replay, replay.move(move.san)));
  }

  /** Result of the game per the rules of chess. Resignations live in the store. */
  result(): GameResult | null {
    if (this.chess.isCheckmate()) return { kind: 'checkmate', winner: opposite(this.turn) };
    if (this.chess.isStalemate()) return { kind: 'stalemate' };
    if (this.chess.isInsufficientMaterial()) return { kind: 'insufficient-material' };
    if (this.chess.isThreefoldRepetition()) return { kind: 'threefold-repetition' };
    if (this.chess.isDrawByFiftyMoves()) return { kind: 'fifty-move' };
    return null;
  }

  /** Everything the UI renders, gathered in one pass. */
  snapshot(): PositionSnapshot {
    const history = this.history();
    const captured = capturedPieces(history);
    return {
      fen: this.fen,
      turn: this.turn,
      board: this.chess.board(),
      inCheck: this.chess.inCheck(),
      isGameOver: this.chess.isGameOver(),
      result: this.result(),
      legalMoves: this.legalMoves(),
      history,
      captured,
      materialBalance: materialBalance(captured),
    };
  }

  private describe(move: Move): MoveRecord {
    return describeWith(this.chess, move);
  }
}

function describeWith(chess: Chess, move: Move): MoveRecord {
  // `move` has already been applied to `chess`, so check state is queried live.
  const isCheckmate = chess.isCheckmate();
  return {
    san: move.san,
    lan: move.lan,
    from: move.from,
    to: move.to,
    piece: move.piece,
    color: move.color,
    captured: move.captured,
    promotion: move.promotion,
    // chess.js treats en passant as its own flag rather than a capture; for
    // everything downstream (narration, tallies, sound) it is one.
    isCapture: move.isCapture() || move.isEnPassant(),
    isEnPassant: move.isEnPassant(),
    isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
    isKingsideCastle: move.isKingsideCastle(),
    isPromotion: move.isPromotion(),
    before: move.before,
    after: move.after,
    givesCheck: chess.inCheck(),
    givesCheckmate: isCheckmate,
    moveNumber: Number(move.before.split(' ')[5] ?? 1),
  };
}

/** Pieces each side has captured, sorted most valuable first. */
export function capturedPieces(history: MoveRecord[]): Record<Color, PieceSymbol[]> {
  const captured: Record<Color, PieceSymbol[]> = { w: [], b: [] };
  for (const move of history) {
    if (move.captured) captured[move.color].push(move.captured);
  }
  (['w', 'b'] as Color[]).forEach((color) => {
    captured[color].sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a]);
  });
  return captured;
}

/** Material difference in pawns. Positive favours White. */
export function materialBalance(captured: Record<Color, PieceSymbol[]>): number {
  const sum = (pieces: PieceSymbol[]) => pieces.reduce((total, p) => total + PIECE_VALUES[p], 0);
  return sum(captured.w) - sum(captured.b);
}
