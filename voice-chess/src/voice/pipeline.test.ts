import { ChessGame } from '@/chess/rules';
import { selectIsGameOver, useGameStore, type PendingClarification } from '@/state/gameStore';
import { parseWithGrammar } from './grammar';
import { interpretUtterance } from './interpret';
import { sanitizeConstraints } from './nlu';
import type { ParsedUtterance } from './intents';
import { resolveMove } from './resolve';

/**
 * End-to-end exercise of the voice pipeline, minus the microphone and the
 * network: transcript → parse → interpret → store.
 *
 * These are the tests that actually pin down the product promise. The unit
 * tests prove each stage behaves; these prove that a sentence a person says
 * ends up as the right piece on the right square — and that a sentence a
 * language model *invents* does not.
 */

function newGame(mode: 'cpu' | 'pass-and-play' = 'cpu') {
  useGameStore.getState().newGame({ mode, playerColor: 'w', difficultyId: 'friendly' });
}

/** Runs one utterance the way `useVoiceSession` does, and returns what happened. */
function say(transcript: string, parsed: ParsedUtterance = parseWithGrammar(transcript)) {
  const store = useGameStore.getState();
  const outcome = interpretUtterance(parsed, {
    snapshot: store.snapshot,
    isPlayersTurn: store.mode === 'pass-and-play' || store.snapshot.turn === store.playerColor,
    isGameOver: selectIsGameOver(store),
    pendingClarification: store.pendingClarification,
  });

  if (outcome.kind === 'move') {
    store.applyMove({ from: outcome.move.from, to: outcome.move.to, promotion: outcome.move.promotion });
  } else if (outcome.kind === 'clarify') {
    store.setClarification(outcome.clarification);
  } else if (outcome.kind === 'promotion') {
    store.applyResolution({
      status: 'needs-promotion',
      from: outcome.from,
      to: outcome.to,
      candidates: [],
    });
  }

  return outcome;
}

/** Drops a fixture position into the live store. */
function setPosition(fen: string) {
  const game = ChessGame.fromFen(fen);
  useGameStore.setState({ game, snapshot: game.snapshot() });
}

const sanOf = (index: number) => useGameStore.getState().snapshot.history[index]?.san;

describe('voice pipeline — spoken moves reach the board', () => {
  beforeEach(() => newGame('pass-and-play'));

  it('plays a full opening from speech alone', () => {
    say('e4');
    say('e5');
    say('knight to f3');
    say('night to see six'); // as a transcription service would mangle it
    say('bishop c4');

    expect(useGameStore.getState().snapshot.history.map((move) => move.san)).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bc4',
    ]);
  });

  it('castles from a spoken instruction', () => {
    ['e4', 'e5', 'knight to f3', 'knight to c6', 'bishop to c4', 'bishop to c5'].forEach((line) =>
      say(line)
    );
    say('castle kingside');
    expect(sanOf(6)).toBe('O-O');
  });

  it('handles a capture spoken loosely', () => {
    say('e4');
    say('d5');
    say('take on d5');
    expect(sanOf(2)).toBe('exd5');
  });
});

describe('voice pipeline — clarification round trip', () => {
  beforeEach(() => {
    newGame('pass-and-play');
    // Two knights, both able to reach d5 — the canonical ambiguity.
    setPosition('4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1');
  });

  it('asks which knight, then plays the one the player names', () => {
    const first = say('knight to d5');
    expect(first.kind).toBe('clarify');
    expect(useGameStore.getState().pendingClarification).not.toBeNull();
    expect(useGameStore.getState().snapshot.history).toHaveLength(0);

    const second = say('the one on e3');
    expect(second.kind).toBe('move');
    expect(sanOf(0)).toBe('Ned5');
    expect(useGameStore.getState().pendingClarification).toBeNull();
  });
});

describe('voice pipeline — promotion round trip', () => {
  beforeEach(() => {
    newGame('pass-and-play');
    setPosition('7k/4P3/8/8/8/8/8/6K1 w - - 0 1');
  });

  it('asks for the piece rather than assuming a queen', () => {
    const outcome = say('pawn to e8');
    expect(outcome.kind).toBe('promotion');
    expect(useGameStore.getState().pendingPromotion).toEqual({ from: 'e7', to: 'e8' });
    expect(useGameStore.getState().snapshot.history).toHaveLength(0);
  });

  it('accepts the piece named up front', () => {
    say('pawn to e8 promote to knight');
    expect(sanOf(0)).toMatch(/^e8=N/);
  });
});

describe('voice pipeline — the model cannot break the rules', () => {
  beforeEach(() => newGame('pass-and-play'));

  /** Builds the parse a language model would have produced. */
  const modelSaid = (raw: Record<string, unknown>): ParsedUtterance => ({
    normalized: 'whatever the player said',
    intent: { kind: 'move', constraints: sanitizeConstraints(raw) },
    confidence: 0.99,
    source: 'llm',
  });

  it('ignores a confidently hallucinated mate', () => {
    const outcome = say('mate in one', modelSaid({ san: 'Qh5#', piece: 'q', to: 'h5' }));
    expect(outcome.kind).toBe('reject');
    expect(useGameStore.getState().snapshot.history).toHaveLength(0);
  });

  it('ignores a move by a piece that is not there', () => {
    const outcome = say('rook takes h8', modelSaid({ piece: 'r', from: 'a4', to: 'h4' }));
    expect(outcome.kind).toBe('reject');
    expect(useGameStore.getState().snapshot.history).toHaveLength(0);
  });

  it('ignores teleportation', () => {
    const outcome = say('king to e5', modelSaid({ piece: 'k', from: 'e1', to: 'e5' }));
    expect(outcome.kind).toBe('reject');
    expect(useGameStore.getState().snapshot.history).toHaveLength(0);
  });

  it('still plays the move when the model gets it right', () => {
    const outcome = say('open with the king pawn', modelSaid({ piece: 'p', to: 'e4' }));
    expect(outcome.kind).toBe('move');
    expect(sanOf(0)).toBe('e4');
  });

  it('never lets any parse produce a move outside the legal list', () => {
    const store = useGameStore.getState();
    const legal = new Set(store.snapshot.legalMoves.map((move) => move.san));

    const adversarial = [
      { san: 'Kd8' },
      { san: 'e5' },
      { san: 'Nxd4' },
      { piece: 'q', from: 'd1', to: 'd8' },
      { piece: 'b', to: 'h6' },
      { from: 'a1', to: 'a8', promotion: 'q' },
    ];

    for (const raw of adversarial) {
      const resolution = resolveMove(store.snapshot.legalMoves, sanitizeConstraints(raw));
      if (resolution.status === 'resolved') {
        expect(legal.has(resolution.move.san)).toBe(true);
      }
    }
  });
});

describe('voice pipeline — turn discipline', () => {
  it('will not let the player move for the CPU', () => {
    newGame('cpu');
    say('e4');
    expect(sanOf(0)).toBe('e4');

    // It is Black's turn and Black is the CPU.
    const outcome = say('e5');
    expect(outcome.kind).toBe('reject');
    expect(useGameStore.getState().snapshot.history).toHaveLength(1);
  });

  it('lets either seat move in pass-and-play', () => {
    newGame('pass-and-play');
    say('e4');
    say('e5');
    expect(useGameStore.getState().snapshot.history).toHaveLength(2);
  });
});

describe('voice pipeline — clarification bookkeeping', () => {
  it('clears a pending question once a move is played', () => {
    newGame('pass-and-play');
    const pending: PendingClarification = {
      kind: 'ambiguous',
      question: 'Which one?',
      candidates: [],
      constraints: {},
    };
    useGameStore.getState().setClarification(pending);

    say('e4');
    expect(useGameStore.getState().pendingClarification).toBeNull();
  });
});
