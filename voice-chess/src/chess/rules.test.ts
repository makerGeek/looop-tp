import { ChessGame } from './rules';

describe('ChessGame — the rules authority', () => {
  it('accepts a legal move and reports it in full', () => {
    const game = new ChessGame();
    const move = game.tryMove({ from: 'e2', to: 'e4' });

    expect(move).not.toBeNull();
    expect(move!.san).toBe('e4');
    expect(move!.lan).toBe('e2e4');
    expect(move!.piece).toBe('p');
    expect(move!.givesCheck).toBe(false);
    expect(game.turn).toBe('b');
  });

  it('refuses an illegal move without throwing', () => {
    const game = new ChessGame();
    expect(game.tryMove({ from: 'e2', to: 'e5' })).toBeNull();
    expect(game.turn).toBe('w');
  });

  it('refuses a move that would leave the king in check', () => {
    // Black king on e8, white rook on e1: the bishop on e5 is absolutely
    // pinned and has no legal move at all, while the king still does.
    const game = ChessGame.fromFen('4k3/8/8/4b3/8/8/8/4RK2 b - - 0 1');

    expect(game.legalMovesFrom('e5')).toHaveLength(0);
    expect(game.tryMove({ from: 'e5', to: 'h2' })).toBeNull();
    expect(game.tryMove({ from: 'e8', to: 'd8' })).not.toBeNull();
  });

  it('detects checkmate and names the winner', () => {
    const game = new ChessGame();
    ['f3', 'e5', 'g4', 'Qh4#'].forEach((san) => expect(game.tryMove(san)).not.toBeNull());

    expect(game.isGameOver()).toBe(true);
    expect(game.result()).toEqual({ kind: 'checkmate', winner: 'b' });
  });

  it('detects stalemate', () => {
    const game = ChessGame.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(game.result()).toEqual({ kind: 'stalemate' });
  });

  it('flags check on the move that delivers it', () => {
    const game = ChessGame.fromFen('4k3/8/8/8/8/8/8/R3K3 w Q - 0 1');
    const move = game.tryMove({ from: 'a1', to: 'a8' });
    expect(move!.givesCheck).toBe(true);
    expect(move!.givesCheckmate).toBe(false);
  });

  it('handles castling, promotion and en passant as first-class moves', () => {
    const castle = ChessGame.fromFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
    const castled = castle.tryMove('O-O');
    expect(castled!.isCastle).toBe(true);
    expect(castled!.isKingsideCastle).toBe(true);

    const promote = ChessGame.fromFen('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    const promoted = promote.tryMove({ from: 'e7', to: 'e8', promotion: 'n' });
    expect(promoted!.isPromotion).toBe(true);
    expect(promoted!.promotion).toBe('n');

    const ep = ChessGame.fromFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
    const captured = ep.tryMove({ from: 'e5', to: 'd6' });
    expect(captured!.isEnPassant).toBe(true);
    expect(captured!.isCapture).toBe(true);
  });

  it('undoes and redoes moves', () => {
    const game = new ChessGame();
    game.tryMove('e4');
    game.tryMove('e5');

    const undone = game.undo();
    expect(undone!.san).toBe('e5');
    expect(game.turn).toBe('b');
    expect(game.canRedo).toBe(true);

    const redone = game.redo();
    expect(redone!.san).toBe('e5');
    expect(game.canRedo).toBe(false);
  });

  it('clears the redo stack once a different move is played', () => {
    const game = new ChessGame();
    game.tryMove('e4');
    game.undo();
    game.tryMove('d4');
    expect(game.canRedo).toBe(false);
  });

  it('tracks captured pieces and material balance', () => {
    const game = new ChessGame();
    ['e4', 'd5', 'exd5', 'Qxd5'].forEach((san) => game.tryMove(san));

    const snapshot = game.snapshot();
    expect(snapshot.captured.w).toEqual(['p']);
    expect(snapshot.captured.b).toEqual(['p']);
    expect(snapshot.materialBalance).toBe(0);
  });

  it('numbers moves the way a score sheet does', () => {
    const game = new ChessGame();
    game.tryMove('e4');
    game.tryMove('e5');
    game.tryMove('Nf3');

    const history = game.snapshot().history;
    expect(history.map((move) => move.moveNumber)).toEqual([1, 1, 2]);
  });

  it('round-trips through PGN', () => {
    const game = new ChessGame();
    ['e4', 'e5', 'Nf3', 'Nc6'].forEach((san) => game.tryMove(san));

    const restored = ChessGame.fromPgn(game.pgn);
    expect(restored).not.toBeNull();
    expect(restored!.fen).toBe(game.fen);
    expect(restored!.snapshot().history).toHaveLength(4);
  });

  it('returns null for PGN it cannot replay', () => {
    expect(ChessGame.fromPgn('1. e4 e5 2. Qxq9 ...')).toBeNull();
  });
});
