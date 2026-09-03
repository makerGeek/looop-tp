import { Chess } from 'chess.js';

import { ChessGame } from '@/chess/rules';
import { LocalEngine, evaluate } from './localEngine';

describe('LocalEngine', () => {
  it('returns a move that is actually legal', async () => {
    const engine = new LocalEngine();
    const game = new ChessGame();

    const result = await engine.search({ fen: game.fen, movetimeMs: 150, skill: 8 });

    expect(result.kind).toBe('local');
    expect(result.bestMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
    expect(game.tryMove({
      from: result.bestMove.slice(0, 2) as never,
      to: result.bestMove.slice(2, 4) as never,
      promotion: result.bestMove[4] as never,
    })).not.toBeNull();
  }, 15_000);

  it('finds mate in one at full strength', async () => {
    const engine = new LocalEngine();
    // Back-rank mate: Ra8#.
    const result = await engine.search({
      fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
      movetimeMs: 800,
      skill: 20,
    });
    expect(result.bestMove).toBe('a1a8');
  }, 20_000);

  it('takes a free queen', async () => {
    const engine = new LocalEngine();
    const result = await engine.search({
      fen: '4k3/8/8/3q4/4B3/8/8/4K3 w - - 0 1',
      movetimeMs: 500,
      skill: 20,
    });
    expect(result.bestMove).toBe('e4d5');
  }, 20_000);

  it('refuses to search a position with no moves', async () => {
    const engine = new LocalEngine();
    await expect(
      engine.search({ fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', movetimeMs: 100, skill: 5 })
    ).rejects.toThrow(/no legal moves/i);
  });
});

describe('evaluate', () => {
  it('is symmetric about the side to move', () => {
    const white = new Chess('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');
    const black = new Chess('4k3/8/8/8/8/8/8/Q3K3 b - - 0 1');
    expect(evaluate(white)).toBeGreaterThan(0);
    expect(evaluate(black)).toBeLessThan(0);
  });

  it('is level in the starting position', () => {
    expect(evaluate(new Chess())).toBe(0);
  });
});
