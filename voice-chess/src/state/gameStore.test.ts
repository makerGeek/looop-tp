import { ChessGame } from '@/chess/rules';
import { resolveMove } from '@/voice/resolve';
import { selectIsGameOver, selectResult, useGameStore } from './gameStore';

/** Starts each test from a known, freshly-created game. */
const reset = () => {
  useGameStore.getState().newGame({ mode: 'cpu', playerColor: 'w', difficultyId: 'friendly' });
  return useGameStore.getState();
};

describe('gameStore — moves', () => {
  beforeEach(() => reset());

  it('plays a legal move and records it', () => {
    const outcome = useGameStore.getState().applyMove({ from: 'e2', to: 'e4' });
    expect(outcome.status).toBe('played');

    const state = useGameStore.getState();
    expect(state.snapshot.history).toHaveLength(1);
    expect(state.lastMove).toEqual({ from: 'e2', to: 'e4' });
    expect(state.snapshot.turn).toBe('b');
  });

  it('rejects an illegal move and leaves the position untouched', () => {
    const before = useGameStore.getState().snapshot.fen;
    expect(useGameStore.getState().applyMove({ from: 'e2', to: 'e5' })).toEqual({ status: 'rejected' });
    expect(useGameStore.getState().snapshot.fen).toBe(before);
  });

  it('asks for a promotion piece instead of assuming a queen', () => {
    reset();
    useGameStore.setState({ game: ChessGame.fromFen('7k/4P3/8/8/8/8/8/6K1 w - - 0 1') });
    useGameStore.setState({ snapshot: useGameStore.getState().game.snapshot() });

    const outcome = useGameStore.getState().applyMove({ from: 'e7', to: 'e8' });
    expect(outcome).toEqual({ status: 'needs-promotion', from: 'e7', to: 'e8' });
    expect(useGameStore.getState().pendingPromotion).toEqual({ from: 'e7', to: 'e8' });
    expect(useGameStore.getState().snapshot.history).toHaveLength(0);

    expect(useGameStore.getState().applyMove({ from: 'e7', to: 'e8', promotion: 'r' }).status).toBe('played');
    // The new rook happens to give check from e8, hence the trailing marker.
    expect(useGameStore.getState().snapshot.history[0]!.san).toBe('e8=R+');
    expect(useGameStore.getState().pendingPromotion).toBeNull();
  });
});

describe('gameStore — engine moves get no special trust', () => {
  beforeEach(() => reset());

  it('plays a legal engine move', () => {
    expect(useGameStore.getState().applyEngineMove('e2e4').status).toBe('played');
    expect(useGameStore.getState().snapshot.history[0]!.san).toBe('e4');
  });

  it('refuses an illegal engine move', () => {
    expect(useGameStore.getState().applyEngineMove('e2e5')).toEqual({ status: 'rejected' });
    expect(useGameStore.getState().snapshot.history).toHaveLength(0);
  });

  it('refuses malformed engine output without throwing', () => {
    expect(useGameStore.getState().applyEngineMove('(none)')).toEqual({ status: 'rejected' });
    expect(useGameStore.getState().applyEngineMove('')).toEqual({ status: 'rejected' });
  });
});

describe('gameStore — selection', () => {
  beforeEach(() => reset());

  it('selects a piece belonging to the side to move', () => {
    useGameStore.getState().select('e2');
    expect(useGameStore.getState().selected).toBe('e2');
    expect(useGameStore.getState().targets.map((move) => move.to).sort()).toEqual(['e3', 'e4']);
  });

  it('ignores an empty square or an opponent piece', () => {
    useGameStore.getState().select('e5');
    expect(useGameStore.getState().selected).toBeNull();

    useGameStore.getState().select('e7');
    expect(useGameStore.getState().selected).toBeNull();
  });

  it('deselects when the same square is tapped twice', () => {
    useGameStore.getState().select('e2');
    useGameStore.getState().select('e2');
    expect(useGameStore.getState().selected).toBeNull();
  });
});

describe('gameStore — undo', () => {
  it('takes back both plies against the CPU so it is the player’s move again', () => {
    reset();
    useGameStore.getState().applyMove({ from: 'e2', to: 'e4' });
    useGameStore.getState().applyEngineMove('e7e5');

    const undone = useGameStore.getState().undo();
    expect(undone).toHaveLength(2);
    expect(useGameStore.getState().snapshot.turn).toBe('w');
    expect(useGameStore.getState().snapshot.history).toHaveLength(0);
  });

  it('takes back a single ply in pass-and-play', () => {
    reset();
    useGameStore.getState().newGame({ mode: 'pass-and-play', playerColor: 'w', difficultyId: 'friendly' });
    useGameStore.getState().applyMove({ from: 'e2', to: 'e4' });
    useGameStore.getState().applyMove({ from: 'e7', to: 'e5' });

    expect(useGameStore.getState().undo()).toHaveLength(1);
    expect(useGameStore.getState().snapshot.turn).toBe('b');
  });

  it('reports nothing to undo on a fresh board', () => {
    reset();
    expect(useGameStore.getState().undo()).toEqual([]);
  });

  it('clears a resignation when the game is rewound', () => {
    reset();
    useGameStore.getState().applyMove({ from: 'e2', to: 'e4' });
    useGameStore.getState().resign('w');
    expect(selectIsGameOver(useGameStore.getState())).toBe(true);

    useGameStore.getState().undo();
    expect(selectIsGameOver(useGameStore.getState())).toBe(false);
  });
});

describe('gameStore — endings', () => {
  beforeEach(() => reset());

  it('records a resignation with the right winner', () => {
    useGameStore.getState().resign('w');
    expect(selectResult(useGameStore.getState())).toEqual({ kind: 'resignation', winner: 'b' });
  });

  it('records an agreed draw', () => {
    useGameStore.getState().agreeDraw();
    expect(selectResult(useGameStore.getState())).toEqual({ kind: 'draw-agreed' });
  });

  it('surfaces checkmate from the rules', () => {
    ['f2f3', 'e7e5', 'g2g4', 'd8h4'].forEach((uci) => useGameStore.getState().applyEngineMove(uci));
    expect(selectResult(useGameStore.getState())).toEqual({ kind: 'checkmate', winner: 'b' });
    expect(useGameStore.getState().applyMove({ from: 'e1', to: 'f2' }).status).toBe('rejected');
  });
});

describe('gameStore — conversation', () => {
  beforeEach(() => reset());

  it('records what was heard and what was said, in order', () => {
    useGameStore.getState().heard('knight to f3');
    useGameStore.getState().say('Knight to f3.');

    const log = useGameStore.getState().conversation;
    expect(log.map((entry) => entry.role)).toEqual(['player', 'app']);
    expect(log[1]!.text).toBe('Knight to f3.');
  });

  it('caps the log so a long game cannot grow it without bound', () => {
    for (let i = 0; i < 200; i += 1) useGameStore.getState().say(`line ${i}`);
    expect(useGameStore.getState().conversation.length).toBeLessThanOrEqual(60);
    expect(useGameStore.getState().conversation.at(-1)!.text).toBe('line 199');
  });
});

describe('gameStore — voice pipeline lands here', () => {
  it('applies a resolution produced by the resolver', () => {
    reset();
    const state = useGameStore.getState();
    const resolution = resolveMove(state.snapshot.legalMoves, { piece: 'n', to: 'f3' });

    expect(useGameStore.getState().applyResolution(resolution).status).toBe('played');
    expect(useGameStore.getState().snapshot.history[0]!.san).toBe('Nf3');
  });

  it('does nothing with an unresolved resolution', () => {
    reset();
    const state = useGameStore.getState();
    const resolution = resolveMove(state.snapshot.legalMoves, { piece: 'q', to: 'h5' });

    expect(useGameStore.getState().applyResolution(resolution)).toEqual({ status: 'rejected' });
    expect(useGameStore.getState().snapshot.history).toHaveLength(0);
  });
});
