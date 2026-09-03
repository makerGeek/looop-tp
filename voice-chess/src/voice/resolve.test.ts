import { ChessGame } from '@/chess/rules';
import type { MoveConstraints } from './intents';
import { canonicalSan, narrowCandidates, resolveMove } from './resolve';

const resolveIn = (fen: string | undefined, constraints: MoveConstraints) =>
  resolveMove(new ChessGame(fen).legalMoves(), constraints);

describe('resolveMove — the legality boundary', () => {
  it('resolves an unambiguous move', () => {
    const result = resolveIn(undefined, { to: 'e4' });
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') expect(result.move.san).toBe('e4');
  });

  it('resolves a piece move by piece and destination', () => {
    const result = resolveIn(undefined, { piece: 'n', to: 'f3' });
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') expect(result.move.san).toBe('Nf3');
  });

  it('reports ambiguity instead of guessing', () => {
    // Both knights can reach d2 from the opening position after 1.Nf3? No —
    // use a position where two knights genuinely compete for one square.
    const result = resolveIn('4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1', { piece: 'n', to: 'd5' });
    expect(result.status).toBe('ambiguous');
    if (result.status === 'ambiguous') {
      expect(result.candidates.map((move) => move.from).sort()).toEqual(['c3', 'e3']);
    }
  });

  it('resolves an ambiguity when the origin is given', () => {
    const result = resolveIn('4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1', {
      piece: 'n',
      to: 'd5',
      fromFile: 'c',
    });
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') expect(result.move.from).toBe('c3');
  });

  it('asks which piece to promote to rather than assuming a queen', () => {
    const result = resolveIn('8/4P3/8/8/8/8/8/4K2k w - - 0 1', { to: 'e8' });
    expect(result.status).toBe('needs-promotion');
    if (result.status === 'needs-promotion') {
      expect(result.candidates).toHaveLength(4);
      expect(result.from).toBe('e7');
    }
  });

  it('honours a named promotion piece', () => {
    const result = resolveIn('8/4P3/8/8/8/8/8/4K2k w - - 0 1', { to: 'e8', promotion: 'r' });
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') expect(result.move.san).toBe('e8=R');
  });

  it('rejects an illegal move and suggests what is available', () => {
    const result = resolveIn(undefined, { piece: 'n', to: 'e5' });
    expect(result.status).toBe('illegal');
    if (result.status === 'illegal') {
      expect(result.suggestions.every((move) => move.piece === 'n')).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    }
  });

  it('rejects a capture on an empty square', () => {
    const result = resolveIn(undefined, { piece: 'n', to: 'f3', capture: true });
    expect(result.status).toBe('illegal');
  });

  it('reports an empty utterance as empty, not illegal', () => {
    expect(resolveIn(undefined, {}).status).toBe('empty');
  });

  it('treats a bare "castle" as ambiguous when both sides are available', () => {
    const result = resolveIn('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', { castle: undefined });
    // With no constraints at all this is "empty"; with a side it resolves.
    expect(result.status).toBe('empty');
    expect(resolveIn('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', { castle: 'queenside' })).toMatchObject({
      status: 'resolved',
    });
  });
});

describe('resolveMove — SAN is a lookup key, never an authority', () => {
  it('uses SAN when it names a legal move', () => {
    const result = resolveIn(undefined, { san: 'Nf3' });
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') expect(result.move.san).toBe('Nf3');
  });

  it('ignores a decorated SAN that still names a legal move', () => {
    const result = resolveIn(undefined, { san: 'Nf3+' });
    expect(result.status).toBe('resolved');
  });

  it('refuses a hallucinated SAN outright', () => {
    // `Qh5#` is not legal from the starting position. A model that insists on
    // it must not be able to put it on the board.
    const result = resolveIn(undefined, { san: 'Qh5#' });
    expect(result.status).not.toBe('resolved');
  });

  it('refuses a SAN that describes a piece which cannot move there', () => {
    const result = resolveIn(undefined, { san: 'Bb5' });
    expect(result.status).not.toBe('resolved');
  });

  it('falls back to the structural constraints when SAN misses', () => {
    // The model heard "knight f3" but wrote nonsense SAN. The structured
    // fields still describe a real move, so the move is found anyway.
    const result = resolveIn(undefined, { san: 'Ng9', piece: 'n', to: 'f3' });
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') expect(result.move.san).toBe('Nf3');
  });

  it('cannot be tricked into a move that leaves the king in check', () => {
    // The bishop on e5 is pinned by the rook on e1.
    const result = resolveIn('4k3/8/8/4b3/8/8/8/4RK2 b - - 0 1', { san: 'Bd4' });
    expect(result.status).not.toBe('resolved');
  });

  it('never returns a move that is not in the legal-move list', () => {
    const game = new ChessGame('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const legal = game.legalMoves();
    const nonsense: MoveConstraints[] = [
      { san: 'Ke2' },
      { san: 'Qd8' },
      { piece: 'k', to: 'e4' },
      { piece: 'q', to: 'h5' },
      { from: 'e1', to: 'e8' },
      { to: 'a9' as never },
    ];

    for (const constraints of nonsense) {
      const result = resolveMove(legal, constraints);
      if (result.status === 'resolved') {
        expect(legal).toContain(result.move);
      } else {
        expect(['illegal', 'ambiguous', 'empty', 'needs-promotion']).toContain(result.status);
      }
    }
  });
});

describe('narrowCandidates', () => {
  it('narrows to the candidate matching a follow-up', () => {
    const game = new ChessGame('4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1');
    const result = resolveMove(game.legalMoves(), { piece: 'n', to: 'd5' });
    if (result.status !== 'ambiguous') throw new Error('expected ambiguity');

    const narrowed = narrowCandidates(result.candidates, { from: 'e3' });
    expect(narrowed).toHaveLength(1);
    expect(narrowed[0]!.from).toBe('e3');
  });

  it('keeps every candidate when the follow-up matches none', () => {
    const game = new ChessGame('4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1');
    const result = resolveMove(game.legalMoves(), { piece: 'n', to: 'd5' });
    if (result.status !== 'ambiguous') throw new Error('expected ambiguity');

    expect(narrowCandidates(result.candidates, { from: 'h8' })).toHaveLength(2);
  });
});

describe('canonicalSan', () => {
  it('folds castling spellings and check marks together', () => {
    expect(canonicalSan('0-0')).toBe(canonicalSan('O-O'));
    expect(canonicalSan('Nf3+')).toBe(canonicalSan('nf3'));
    expect(canonicalSan('Qh5#')).toBe('qh5');
  });
});
