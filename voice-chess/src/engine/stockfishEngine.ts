import type { ChessEngine, SearchRequest, SearchResult } from './types';
import { isPlausibleUciMove } from './types';

/**
 * A UCI client for the Stockfish build running inside the WebView.
 *
 * This class owns the protocol only. It knows nothing about React and nothing
 * about the WebView itself — it is handed a `send` function and fed lines. That
 * keeps the state machine testable without a renderer.
 */
export class StockfishEngine implements ChessEngine {
  readonly kind = 'stockfish' as const;
  name = 'Stockfish (WASM)';

  private send: (command: string) => void = () => {};
  private booted = false;
  private bootWaiters: { resolve: () => void; reject: (error: Error) => void }[] = [];
  private awaitingUciOk = false;
  private awaitingReadyOk = false;

  private search$: {
    resolve: (result: SearchResult) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    scoreCp?: number;
    mateIn?: number;
    depth?: number;
  } | null = null;

  /** Called by the host component once the WebView bridge is live. */
  attach(send: (command: string) => void): void {
    this.send = send;
    this.awaitingUciOk = true;
    this.send('uci');
  }

  /** Called by the host component when the WebView fails outright. */
  fail(reason: string): void {
    const error = new Error(reason);
    this.bootWaiters.forEach((waiter) => waiter.reject(error));
    this.bootWaiters = [];
    this.search$?.reject(error);
    this.clearSearch();
  }

  init(): Promise<void> {
    if (this.booted) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.bootWaiters.push({ resolve, reject });
    });
  }

  /** Feeds one line of engine output into the state machine. */
  handleLine(line: string): void {
    const text = line.trim();
    if (!text) return;

    if (this.awaitingUciOk) {
      const idMatch = text.match(/^id name (.+)$/);
      if (idMatch) this.name = idMatch[1]!.trim();
      if (text === 'uciok') {
        this.awaitingUciOk = false;
        this.awaitingReadyOk = true;
        this.send('setoption name Ponder value false');
        this.send('setoption name Threads value 1');
        this.send('isready');
      }
      return;
    }

    if (this.awaitingReadyOk && text === 'readyok') {
      this.awaitingReadyOk = false;
      this.booted = true;
      this.bootWaiters.forEach((waiter) => waiter.resolve());
      this.bootWaiters = [];
      return;
    }

    if (!this.search$) return;

    if (text.startsWith('info ')) {
      const depth = text.match(/\bdepth (\d+)/);
      if (depth) this.search$.depth = Number(depth[1]);
      const cp = text.match(/\bscore cp (-?\d+)/);
      if (cp) {
        this.search$.scoreCp = Number(cp[1]);
        this.search$.mateIn = undefined;
      }
      const mate = text.match(/\bscore mate (-?\d+)/);
      if (mate) {
        this.search$.mateIn = Number(mate[1]);
        this.search$.scoreCp = undefined;
      }
      return;
    }

    if (text.startsWith('bestmove')) {
      const bestMove = text.split(/\s+/)[1] ?? '';
      const pending = this.search$;
      this.clearSearch();
      if (!isPlausibleUciMove(bestMove)) {
        pending.reject(new Error(`Stockfish returned an unusable move: "${bestMove}"`));
        return;
      }
      pending.resolve({
        bestMove,
        scoreCp: pending.scoreCp,
        mateIn: pending.mateIn,
        depth: pending.depth,
        kind: 'stockfish',
      });
    }
  }

  search(request: SearchRequest): Promise<SearchResult> {
    if (this.search$) this.stop();

    return new Promise<SearchResult>((resolve, reject) => {
      // A grace window on top of `movetime`: if the engine goes quiet we want a
      // definite failure the caller can fall back from, not a hung turn.
      const timer = setTimeout(
        () => {
          this.clearSearch();
          this.send('stop');
          reject(new Error('Stockfish did not answer in time'));
        },
        request.movetimeMs + 5_000
      );

      this.search$ = { resolve, reject, timer };

      this.applyStrength(request);
      this.send(`position fen ${request.fen}`);
      this.send(`go movetime ${Math.max(50, Math.round(request.movetimeMs))}`);
    });
  }

  /**
   * Two knobs, used together: `Skill Level` blunders in a human-ish way, while
   * `UCI_Elo` clamps the search. Levels below 20 also get less time, because a
   * beginner opponent that thinks for two seconds feels wrong.
   */
  private applyStrength(request: SearchRequest): void {
    const skill = Math.min(20, Math.max(0, Math.round(request.skill)));
    this.send(`setoption name Skill Level value ${skill}`);
    if (request.targetElo) {
      const elo = Math.min(2850, Math.max(800, Math.round(request.targetElo)));
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${elo}`);
    } else {
      this.send('setoption name UCI_LimitStrength value false');
    }
  }

  stop(): void {
    if (!this.search$) return;
    const pending = this.search$;
    this.clearSearch();
    this.send('stop');
    pending.reject(new Error('Search cancelled'));
  }

  dispose(): void {
    this.stop();
    this.booted = false;
    this.bootWaiters = [];
  }

  private clearSearch(): void {
    if (this.search$) clearTimeout(this.search$.timer);
    this.search$ = null;
  }
}
