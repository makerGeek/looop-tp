import { ChessGame } from './rules';
import {
  describeMove,
  describeMovesFrom,
  describePosition,
  describeResult,
  describeStatus,
  listPhrase,
} from './narration';

function play(sans: string[], fen?: string) {
  const game = new ChessGame(fen);
  sans.forEach((san) => {
    if (!game.tryMove(san)) throw new Error(`Illegal fixture move: ${san}`);
  });
  return game;
}

describe('describeMove', () => {
  it('describes a quiet move', () => {
    const game = play(['e4']);
    expect(describeMove(game.snapshot().history[0]!)).toBe('Pawn to e4.');
  });

  it('describes a piece move', () => {
    const game = play(['Nf3']);
    expect(describeMove(game.snapshot().history[0]!)).toBe('Knight to f3.');
  });

  it('describes a capture', () => {
    const game = play(['e4', 'd5', 'exd5']);
    expect(describeMove(game.snapshot().history[2]!)).toBe('Pawn takes on d5.');
  });

  it('describes en passant explicitly', () => {
    // 1. e4 Nf6 2. e5 d5 3. exd6
    const game = play(['e4', 'Nf6', 'e5', 'd5', 'exd6']);
    expect(describeMove(game.snapshot().history[4]!)).toBe('Pawn takes on d6 en passant.');
  });

  it('describes castling by side', () => {
    const game = play(['O-O'], '4k3/8/8/8/8/8/8/4K2R w K - 0 1');
    expect(describeMove(game.snapshot().history[0]!)).toBe('Castles kingside.');
  });

  it('describes promotion', () => {
    const game = play(['e8=Q'], '7k/4P3/8/8/8/8/8/6K1 w - - 0 1');
    expect(describeMove(game.snapshot().history[0]!)).toMatch(/promotes to queen/);
  });

  it('flags check and checkmate', () => {
    const mate = play(['f3', 'e5', 'g4', 'Qh4#']);
    expect(describeMove(mate.snapshot().history[3]!)).toMatch(/Checkmate\.$/);

    const check = play(['Ra8+'], '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1');
    // Seeded so the phrasing is deterministic in tests.
    expect(describeMove(check.snapshot().history[0]!, { seed: 0 })).toBe('Rook to a8. Check.');
  });
});

describe('describeResult', () => {
  it('names the winner of a checkmate', () => {
    expect(describeResult({ kind: 'checkmate', winner: 'b' })).toBe('Checkmate. Black wins.');
  });

  it('covers every draw kind', () => {
    expect(describeResult({ kind: 'stalemate' })).toMatch(/draw/i);
    expect(describeResult({ kind: 'insufficient-material' })).toMatch(/draw/i);
    expect(describeResult({ kind: 'threefold-repetition' })).toMatch(/repetition/i);
    expect(describeResult({ kind: 'fifty-move' })).toMatch(/fifty/i);
    expect(describeResult({ kind: 'draw-agreed' })).toMatch(/agreed/i);
    expect(describeResult({ kind: 'resignation', winner: 'w' })).toMatch(/White wins/);
  });
});

describe('describeStatus', () => {
  it('reports whose move it is', () => {
    expect(describeStatus(new ChessGame().snapshot())).toBe('White to move');
  });

  it('mentions check', () => {
    const game = play(['e4', 'e5', 'Qh5', 'Nc6', 'Qxf7+']);
    expect(describeStatus(game.snapshot())).toBe('Black to move — in check');
  });
});

describe('describePosition', () => {
  it('summarises the game so far', () => {
    const game = play(['e4', 'd5', 'exd5']);
    const spoken = describePosition(game.snapshot(), 'w');
    expect(spoken).toMatch(/last move was pawn takes on d5/i);
    expect(spoken).toMatch(/black is thinking|your move/i);
    expect(spoken).toMatch(/up a pawn/i);
  });

  it('reports the finished result instead of the position', () => {
    const game = play(['f3', 'e5', 'g4', 'Qh4#']);
    expect(describePosition(game.snapshot(), 'w')).toMatch(/checkmate/i);
  });
});

describe('helpers', () => {
  it('lists options the way a person would say them', () => {
    expect(listPhrase(['Nf3'])).toBe('Nf3');
    expect(listPhrase(['Nf3', 'Nc3'])).toBe('Nf3 or Nc3');
    expect(listPhrase(['a', 'b', 'c'])).toBe('a, b, or c');
  });

  it('describes what a square can do', () => {
    expect(describeMovesFrom('b1', [])).toMatch(/nothing on b1/i);
    expect(describeMovesFrom('b1', ['Nc3'])).toMatch(/only nc3/i);
    expect(describeMovesFrom('b1', ['Nc3', 'Na3'])).toMatch(/nc3 or na3/i);
  });
});
