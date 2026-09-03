import type { Color, GameMode } from '@/chess/types';

/**
 * The seam for online play.
 *
 * Nothing in this app talks to a server today, and adding one should not mean
 * rewriting the game. Every source of moves — the local seat, the engine, and
 * one day a remote opponent — is the same shape: something that emits moves and
 * accepts them.
 *
 * `MatchTransport` is that shape. `LocalTransport` implements it for
 * pass-and-play and vs-CPU, which are the two modes that ship. A future
 * `RealtimeTransport` would implement the same five methods over a socket, and
 * the rest of the app would not notice:
 *
 * ```ts
 * class RealtimeTransport implements MatchTransport {
 *   // connect() opens the socket and joins a room
 *   // sendMove() publishes { matchId, ply, uci } and waits for the ack
 *   // subscribe() replays missed plies on reconnect, then streams new ones
 * }
 * ```
 *
 * ### What the design already accounts for
 * - **Moves are transported as UCI strings, never as board state.** The remote
 *   peer's move is validated by the local `ChessGame` exactly like a spoken
 *   move, so a malicious client cannot post an illegal position.
 * - **`ply` numbers every move**, so a client that reconnects can ask for what
 *   it missed and replay deterministically.
 * - **Clock and result are separate events** from moves, because online play
 *   needs the server to be the authority on time and on abandonment.
 * - **The store is already transport-agnostic**: `applyEngineMove` is really
 *   "apply a move that came from outside", and a remote move would use it
 *   unchanged.
 *
 * ### What is deliberately not here
 * Matchmaking, authentication, ratings and reconnection policy are server
 * concerns. Sketching their client stubs before a server exists would be
 * fiction, so the interface stops at the boundary that the app actually needs.
 */

export interface RemoteMove {
  /** Half-move index, 0-based. Lets a reconnecting client replay in order. */
  ply: number;
  /** Long algebraic, e.g. `e2e4`. Validated locally before it reaches the board. */
  uci: string;
  /** Server timestamp, milliseconds since epoch. */
  at: number;
}

export interface MatchClock {
  whiteMs: number;
  blackMs: number;
  runningFor: Color | null;
}

export type MatchEvent =
  | { type: 'move'; move: RemoteMove }
  | { type: 'clock'; clock: MatchClock }
  | { type: 'result'; reason: string; winner: Color | null }
  | { type: 'opponent-connection'; connected: boolean };

export interface MatchDescriptor {
  id: string;
  mode: GameMode | 'online';
  /** Which colour this device plays. `null` when both seats are local. */
  seat: Color | null;
  startingFen: string;
}

export interface MatchTransport {
  readonly descriptor: MatchDescriptor;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Publishes a move this device made. Resolves once it is accepted. */
  sendMove(uci: string, ply: number): Promise<void>;
  /** Streams events from the other side. Returns an unsubscribe function. */
  subscribe(listener: (event: MatchEvent) => void): () => void;
}

/**
 * The transport used by both shipping modes.
 *
 * Both seats are on this device, so "sending" a move is just echoing it back to
 * the listeners. Having local play go through the same interface as a future
 * network transport means the online path will exercise code that is already
 * running in production, rather than a branch nobody tests.
 */
export class LocalTransport implements MatchTransport {
  private listeners = new Set<(event: MatchEvent) => void>();

  constructor(readonly descriptor: MatchDescriptor) {}

  async connect(): Promise<void> {
    this.emit({ type: 'opponent-connection', connected: true });
  }

  async disconnect(): Promise<void> {
    this.listeners.clear();
  }

  async sendMove(uci: string, ply: number): Promise<void> {
    this.emit({ type: 'move', move: { ply, uci, at: Date.now() } });
  }

  subscribe(listener: (event: MatchEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: MatchEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
