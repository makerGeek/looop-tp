import { StockfishEngine } from './stockfishEngine';

/** Drives the engine's UCI state machine without a WebView. */
function harness() {
  const engine = new StockfishEngine();
  const sent: string[] = [];
  engine.attach((command) => sent.push(command));
  return { engine, sent };
}

/** Replays the handshake a real Stockfish build performs. */
function completeHandshake(engine: StockfishEngine) {
  engine.handleLine('id name Stockfish 10 64');
  engine.handleLine('uciok');
  engine.handleLine('readyok');
}

describe('StockfishEngine — UCI handshake', () => {
  it('asks for the protocol as soon as it is attached', () => {
    const { sent } = harness();
    expect(sent).toEqual(['uci']);
  });

  it('resolves init only after readyok', async () => {
    const { engine } = harness();
    let ready = false;
    const init = engine.init().then(() => {
      ready = true;
    });

    engine.handleLine('uciok');
    expect(ready).toBe(false);

    engine.handleLine('readyok');
    await init;
    expect(ready).toBe(true);
  });

  it('adopts the engine name it reports', async () => {
    const { engine } = harness();
    const init = engine.init();
    completeHandshake(engine);
    await init;
    expect(engine.name).toBe('Stockfish 10 64');
  });

  it('rejects pending waiters when the host reports failure', async () => {
    const { engine } = harness();
    const init = engine.init();
    engine.fail('WebView died');
    await expect(init).rejects.toThrow('WebView died');
  });
});

describe('StockfishEngine — search', () => {
  it('sends position and go, and resolves with the best move', async () => {
    const { engine, sent } = harness();
    const init = engine.init();
    completeHandshake(engine);
    await init;
    sent.length = 0;

    const search = engine.search({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      movetimeMs: 300,
      skill: 12,
    });

    expect(sent).toContain('setoption name Skill Level value 12');
    expect(sent).toContain('position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(sent).toContain('go movetime 300');

    engine.handleLine('info depth 12 score cp 31 pv e2e4');
    engine.handleLine('bestmove e2e4 ponder e7e5');

    await expect(search).resolves.toEqual({
      bestMove: 'e2e4',
      scoreCp: 31,
      mateIn: undefined,
      depth: 12,
      kind: 'stockfish',
    });
  });

  it('limits strength when a target Elo is given', async () => {
    const { engine, sent } = harness();
    const init = engine.init();
    completeHandshake(engine);
    await init;
    sent.length = 0;

    const search = engine.search({ fen: 'startpos', movetimeMs: 100, skill: 3, targetElo: 1100 });
    expect(sent).toContain('setoption name UCI_LimitStrength value true');
    expect(sent).toContain('setoption name UCI_Elo value 1100');

    engine.handleLine('bestmove e2e4');
    await search;
  });

  it('reports a mate score', async () => {
    const { engine } = harness();
    const init = engine.init();
    completeHandshake(engine);
    await init;

    const search = engine.search({ fen: 'x', movetimeMs: 100, skill: 20 });
    engine.handleLine('info depth 4 score mate 2 pv d8h4');
    engine.handleLine('bestmove d8h4');

    await expect(search).resolves.toMatchObject({ mateIn: 2, scoreCp: undefined });
  });

  it('refuses output that is not a move', async () => {
    const { engine } = harness();
    const init = engine.init();
    completeHandshake(engine);
    await init;

    const search = engine.search({ fen: 'x', movetimeMs: 100, skill: 20 });
    engine.handleLine('bestmove (none)');
    await expect(search).rejects.toThrow(/unusable move/);
  });

  it('gives up rather than hanging when the engine goes silent', async () => {
    jest.useFakeTimers();
    const { engine } = harness();
    const init = engine.init();
    completeHandshake(engine);
    await init;

    const search = engine.search({ fen: 'x', movetimeMs: 100, skill: 20 });
    const assertion = expect(search).rejects.toThrow(/did not answer/);
    jest.advanceTimersByTime(6_000);
    await assertion;
    jest.useRealTimers();
  });

  it('cancels a search on stop', async () => {
    const { engine, sent } = harness();
    const init = engine.init();
    completeHandshake(engine);
    await init;

    const search = engine.search({ fen: 'x', movetimeMs: 500, skill: 20 });
    engine.stop();
    await expect(search).rejects.toThrow(/cancelled/i);
    expect(sent).toContain('stop');
  });
});
