import { ChessGame } from '@/chess/rules';
import type { PendingClarification } from '@/state/gameStore';
import { parseWithGrammar } from './grammar';
import { interpretUtterance, type InterpretContext } from './interpret';
import { resolveMove } from './resolve';

function contextFor(
  fen: string | undefined,
  overrides: Partial<InterpretContext> = {}
): InterpretContext {
  const game = new ChessGame(fen);
  return {
    snapshot: game.snapshot(),
    isPlayersTurn: true,
    isGameOver: false,
    pendingClarification: null,
    ...overrides,
  };
}

const heard = (text: string, context: InterpretContext) =>
  interpretUtterance(parseWithGrammar(text), context);

describe('interpretUtterance — playing moves', () => {
  it('plays a move it can pin down', () => {
    const outcome = heard('knight to f3', contextFor(undefined));
    expect(outcome.kind).toBe('move');
    if (outcome.kind === 'move') expect(outcome.move.san).toBe('Nf3');
  });

  it('asks which piece when two could go there', () => {
    const outcome = heard('knight to d5', contextFor('4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1'));
    expect(outcome.kind).toBe('clarify');
    if (outcome.kind === 'clarify') {
      expect(outcome.speech).toMatch(/which knight/i);
      expect(outcome.clarification.candidates).toHaveLength(2);
    }
  });

  it('explains an illegal move instead of just refusing', () => {
    const outcome = heard('knight to e5', contextFor(undefined));
    expect(outcome.kind).toBe('reject');
    if (outcome.kind === 'reject') {
      expect(outcome.speech).toMatch(/no knight can reach e5/i);
      expect(outcome.speech).toMatch(/you could play/i);
    }
  });

  it('asks for the promotion piece rather than assuming', () => {
    const outcome = heard('pawn to e8', contextFor('8/4P3/8/8/8/8/8/4K2k w - - 0 1'));
    expect(outcome.kind).toBe('promotion');
    if (outcome.kind === 'promotion') expect(outcome.speech).toMatch(/queen, rook, bishop or knight/i);
  });

  it('refuses to move out of turn, politely', () => {
    const outcome = heard('e4', contextFor(undefined, { isPlayersTurn: false }));
    expect(outcome).toEqual({ kind: 'reject', speech: expect.stringMatching(/not your move/i) });
  });

  it('refuses to move once the game is over', () => {
    const outcome = heard('e4', contextFor(undefined, { isGameOver: true }));
    expect(outcome.kind).toBe('reject');
    if (outcome.kind === 'reject') expect(outcome.speech).toMatch(/finished/i);
  });

  it('says so when it did not understand', () => {
    const outcome = heard('lovely weather today', contextFor(undefined));
    expect(outcome.kind).toBe('unheard');
  });
});

describe('interpretUtterance — commands and questions come first', () => {
  it('accepts commands even after the game has ended', () => {
    const outcome = heard('new game', contextFor(undefined, { isGameOver: true }));
    expect(outcome).toEqual({ kind: 'command', command: 'new-game' });
  });

  it('accepts questions when it is not the player’s turn', () => {
    const outcome = heard("what's the position", contextFor(undefined, { isPlayersTurn: false }));
    expect(outcome).toMatchObject({ kind: 'question', question: 'position' });
  });
});

describe('interpretUtterance — answering its own clarifying question', () => {
  const fen = '4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1';

  function pendingAmbiguity(): PendingClarification {
    const game = new ChessGame(fen);
    const result = resolveMove(game.legalMoves(), { piece: 'n', to: 'd5' });
    if (result.status !== 'ambiguous') throw new Error('fixture is not ambiguous');
    return {
      kind: 'ambiguous',
      question: 'Which knight?',
      candidates: result.candidates,
      constraints: { piece: 'n', to: 'd5' },
    };
  }

  it('resolves the question from a bare square', () => {
    const outcome = heard('c3', contextFor(fen, { pendingClarification: pendingAmbiguity() }));
    expect(outcome.kind).toBe('move');
    if (outcome.kind === 'move') expect(outcome.move.from).toBe('c3');
  });

  it('resolves the question from a fragment', () => {
    const outcome = heard('the one on e3', contextFor(fen, { pendingClarification: pendingAmbiguity() }));
    expect(outcome.kind).toBe('move');
    if (outcome.kind === 'move') expect(outcome.move.from).toBe('e3');
  });

  it('lets the player back out', () => {
    const outcome = heard('no', contextFor(fen, { pendingClarification: pendingAmbiguity() }));
    expect(outcome.kind).toBe('reject');
  });

  it('answers a promotion question with just the piece name', () => {
    const game = new ChessGame('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    const result = resolveMove(game.legalMoves(), { to: 'e8' });
    if (result.status !== 'needs-promotion') throw new Error('fixture is not a promotion');

    const pending: PendingClarification = {
      kind: 'promotion',
      question: 'Promote to what?',
      candidates: result.candidates,
      constraints: { to: 'e8' },
    };

    const outcome = heard('knight', contextFor('8/4P3/8/8/8/8/8/4K2k w - - 0 1', {
      pendingClarification: pending,
    }));
    expect(outcome.kind).toBe('move');
    if (outcome.kind === 'move') expect(outcome.move.san).toBe('e8=N');
  });

  it('falls through to a normal move when the answer is a different move entirely', () => {
    const outcome = heard('king to d1', contextFor(fen, { pendingClarification: pendingAmbiguity() }));
    expect(outcome.kind).toBe('move');
    if (outcome.kind === 'move') expect(outcome.move.san).toBe('Kd1');
  });
});
