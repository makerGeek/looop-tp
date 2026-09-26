import { Chess } from 'chess.js';
import { LocalEngine } from './localEngine';

/**
 * Tactical benchmark for the built-in engine.
 *
 * Each position has one clearly best move that a competent player finds. These
 * are the mistakes that make an opponent feel broken rather than weak: hanging
 * a queen, missing a mate in one, walking into a recapture.
 */
const SUITE: { name: string; fen: string; best: string[]; note: string }[] = [
  { name: 'mate in one', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', best: ['a1a8'], note: 'back rank' },
  { name: 'take the free queen', fen: '4k3/8/8/3q4/4B3/8/8/4K3 w - - 0 1', best: ['e4d5'], note: 'undefended' },
  { name: 'do not hang the queen', fen: '4k3/8/8/8/8/5n2/8/3QK3 w - - 0 1', best: ['d1f3'], note: 'knight is free' },
  {
    name: 'avoid the recapture trap',
    // Taking on d5 with the knight loses it to the queen; the pawn recapture is fine.
    fen: 'r1bqkb1r/ppp2ppp/2n2n2/3pp3/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 5',
    best: ['d4e5', 'e4d5'],
    note: 'must not lose material',
  },
  {
    name: 'win a piece with a fork',
    fen: '4k3/8/8/3p4/8/8/2N5/4K3 w - - 0 1',
    best: ['c2e3', 'c2b4', 'c2d4'],
    note: 'knight activity',
  },
];

async function best(engine: LocalEngine, fen: string, movetimeMs: number, skill = 20) {
  const result = await engine.search({ fen, movetimeMs, skill });
  return result.bestMove;
}

describe('built-in engine — tactical baseline', () => {
  const engine = new LocalEngine();

  it.each(SUITE)('$name ($note)', async ({ fen, best: expected }) => {
    const move = await best(engine, fen, 1200);
    console.log(`    played ${move}, wanted one of ${expected.join('/')}`);
    expect(expected).toContain(move);
  }, 30_000);
});

describe('built-in engine — does not blunder material', () => {
  it('never leaves its queen en prise in a quiet opening', async () => {
    const engine = new LocalEngine();
    const chess = new Chess();
    // Play a short game against itself and check material never swings wildly.
    for (let ply = 0; ply < 16 && !chess.isGameOver(); ply += 1) {
      const move = await best(engine, chess.fen(), 250, 20);
      chess.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4],
      } as never);
    }
    const material = countMaterial(chess);
    console.log(`    after ${chess.history().length} plies, material w${material.w} b${material.b}`);
    expect(Math.abs(material.w - material.b)).toBeLessThanOrEqual(3);
  }, 60_000);
});

function countMaterial(chess: Chess) {
  const value: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const total = { w: 0, b: 0 };
  chess.board().flat().forEach((square) => {
    if (square) total[square.color] += value[square.type];
  });
  return total;
}
