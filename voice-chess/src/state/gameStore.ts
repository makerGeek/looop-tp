import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { opposite } from '@/chess/board';
import { ChessGame } from '@/chess/rules';
import type {
  Color,
  GameMode,
  GameResult,
  Move,
  MoveRecord,
  PieceSymbol,
  PositionSnapshot,
  Square,
} from '@/chess/types';
import { DEFAULT_DIFFICULTY_ID } from '@/engine/difficulty';
import type { MoveConstraints } from '@/voice/intents';
import type { MoveResolution } from '@/voice/resolve';

/**
 * The single source of truth for a game in progress.
 *
 * Every path that can put a piece on the board — a tap, a drag, a spoken move,
 * the engine's reply — funnels through `applyMove`, which asks `ChessGame` to
 * make the move and does nothing if it refuses. There is no second code path
 * that can bypass the rules.
 *
 * The store holds no React, no engine and no network: the CPU turn and the
 * voice loop are hooks that *drive* this store from the outside. That keeps the
 * game logic testable in plain Node.
 */

export type ConversationTone = 'normal' | 'error' | 'hint' | 'system';

export interface ConversationEntry {
  id: string;
  role: 'player' | 'app';
  text: string;
  tone: ConversationTone;
  at: number;
}

/** An open question the app is waiting on an answer to. */
export interface PendingClarification {
  kind: 'ambiguous' | 'promotion';
  question: string;
  candidates: Move[];
  /** What we understood so far; the follow-up narrows this. */
  constraints: MoveConstraints;
}

export interface NewGameOptions {
  mode: GameMode;
  playerColor: Color;
  difficultyId: string;
}

interface GameState {
  mode: GameMode;
  playerColor: Color;
  difficultyId: string;

  game: ChessGame;
  snapshot: PositionSnapshot;
  orientation: Color;

  selected: Square | null;
  /** Legal moves out of `selected`, precomputed for the board overlay. */
  targets: Move[];
  lastMove: { from: Square; to: Square } | null;

  /** Set when a move is legal but the promotion piece is still unknown. */
  pendingPromotion: { from: Square; to: Square } | null;
  pendingClarification: PendingClarification | null;

  /** Endings the rules of chess can't detect on their own. */
  manualResult: GameResult | null;

  conversation: ConversationEntry[];
  hydrated: boolean;

  newGame(options: NewGameOptions): void;
  select(square: Square | null): void;
  /** Plays a move if it is legal. Returns what happened. */
  applyMove(input: { from: Square; to: Square; promotion?: PieceSymbol }): MoveOutcome;
  /** Plays an already-resolved move from the voice pipeline. */
  applyResolution(resolution: MoveResolution): MoveOutcome;
  /** Plays a UCI move suggested by an engine — still checked for legality. */
  applyEngineMove(uci: string): MoveOutcome;
  cancelPromotion(): void;
  setClarification(clarification: PendingClarification | null): void;
  undo(): MoveRecord[];
  redo(): MoveRecord | null;
  resign(color: Color): void;
  agreeDraw(): void;
  flipBoard(): void;
  setOrientation(color: Color): void;
  say(text: string, tone?: ConversationTone): void;
  heard(text: string): void;
  clearConversation(): void;
}

export type MoveOutcome =
  | { status: 'played'; move: MoveRecord }
  | { status: 'needs-promotion'; from: Square; to: Square }
  | { status: 'rejected' };

/** The result of the game, including endings the rules can't see. */
export function selectResult(state: Pick<GameState, 'manualResult' | 'snapshot'>): GameResult | null {
  return state.manualResult ?? state.snapshot.result;
}

export function selectIsGameOver(state: Pick<GameState, 'manualResult' | 'snapshot'>): boolean {
  return selectResult(state) !== null;
}

let conversationSeq = 0;

function entry(role: 'player' | 'app', text: string, tone: ConversationTone): ConversationEntry {
  conversationSeq += 1;
  return { id: `c${conversationSeq}`, role, text, tone, at: Date.now() };
}

/** Conversation is capped so a long game can't grow the store without bound. */
const MAX_CONVERSATION = 60;

function initialState(options: NewGameOptions) {
  const game = new ChessGame();
  return {
    mode: options.mode,
    playerColor: options.playerColor,
    difficultyId: options.difficultyId,
    game,
    snapshot: game.snapshot(),
    orientation: options.playerColor,
    selected: null,
    targets: [] as Move[],
    lastMove: null,
    pendingPromotion: null,
    pendingClarification: null,
    manualResult: null,
    conversation: [] as ConversationEntry[],
  };
}

const DEFAULTS: NewGameOptions = {
  mode: 'cpu',
  playerColor: 'w',
  difficultyId: DEFAULT_DIFFICULTY_ID,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState(DEFAULTS),
      hydrated: false,

      newGame: (options) => set({ ...initialState(options), hydrated: true }),

      select: (square) => {
        const { game, snapshot, selected } = get();
        if (square === null || square === selected) {
          set({ selected: null, targets: [] });
          return;
        }
        const piece = game.pieceAt(square);
        if (!piece || piece.color !== snapshot.turn) {
          set({ selected: null, targets: [] });
          return;
        }
        set({ selected: square, targets: game.legalMovesFrom(square) });
      },

      applyMove: ({ from, to, promotion }) => {
        const { game } = get();
        if (selectIsGameOver(get())) return { status: 'rejected' };

        // A promotion with no piece named is a question for the UI, not a
        // rejection — the move itself is fine.
        if (!promotion) {
          const options = game.legalMovesFrom(from).filter((move) => move.to === to);
          if (options.length > 1 && options.every((move) => move.isPromotion())) {
            set({ pendingPromotion: { from, to }, selected: null, targets: [] });
            return { status: 'needs-promotion', from, to };
          }
        }

        const record = game.tryMove({ from, to, promotion });
        if (!record) return { status: 'rejected' };
        commit(set, get, record);
        return { status: 'played', move: record };
      },

      applyResolution: (resolution) => {
        if (resolution.status === 'resolved') {
          const { move } = resolution;
          return get().applyMove({
            from: move.from,
            to: move.to,
            promotion: move.promotion as PieceSymbol | undefined,
          });
        }
        if (resolution.status === 'needs-promotion') {
          set({
            pendingPromotion: { from: resolution.from, to: resolution.to },
            selected: null,
            targets: [],
          });
          return { status: 'needs-promotion', from: resolution.from, to: resolution.to };
        }
        return { status: 'rejected' };
      },

      applyEngineMove: (uci) => {
        const { game } = get();
        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        const promotion = (uci[4] as PieceSymbol | undefined) ?? undefined;
        // Engine output gets exactly the same scrutiny as a spoken move.
        const record = game.tryMove({ from, to, promotion });
        if (!record) return { status: 'rejected' };
        commit(set, get, record);
        return { status: 'played', move: record };
      },

      cancelPromotion: () => set({ pendingPromotion: null }),

      setClarification: (pendingClarification) => set({ pendingClarification }),

      undo: () => {
        const { game, mode, playerColor } = get();
        const undone: MoveRecord[] = [];

        const first = game.undo();
        if (!first) return [];
        undone.push(first);

        // Against the CPU, one "take that back" should hand the move back to
        // the player rather than leaving them staring at the engine's turn.
        if (mode === 'cpu' && game.turn !== playerColor) {
          const second = game.undo();
          if (second) undone.push(second);
        }

        const snapshot = game.snapshot();
        set({
          snapshot,
          manualResult: null,
          selected: null,
          targets: [],
          pendingPromotion: null,
          pendingClarification: null,
          lastMove: lastMoveOf(snapshot),
        });
        return undone;
      },

      redo: () => {
        const record = get().game.redo();
        if (!record) return null;
        commit(set, get, record);
        return record;
      },

      resign: (color) =>
        set({
          manualResult: { kind: 'resignation', winner: opposite(color) },
          selected: null,
          targets: [],
          pendingClarification: null,
        }),

      agreeDraw: () => set({ manualResult: { kind: 'draw-agreed' }, pendingClarification: null }),

      flipBoard: () => set((state) => ({ orientation: opposite(state.orientation) })),

      setOrientation: (orientation) => set({ orientation }),

      say: (text, tone = 'normal') =>
        set((state) => ({
          conversation: trim([...state.conversation, entry('app', text, tone)]),
        })),

      heard: (text) =>
        set((state) => ({
          conversation: trim([...state.conversation, entry('player', text, 'normal')]),
        })),

      clearConversation: () => set({ conversation: [] }),
    }),
    {
      name: 'voice-chess.game',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // `ChessGame` and the derived snapshot are rebuilt from PGN on rehydrate.
      partialize: (state) => ({
        mode: state.mode,
        playerColor: state.playerColor,
        difficultyId: state.difficultyId,
        orientation: state.orientation,
        manualResult: state.manualResult,
        pgn: state.game.pgn,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<GameState> & { pgn?: string };
        const game = saved.pgn ? ChessGame.fromPgn(saved.pgn) : null;
        if (!game) return { ...current, hydrated: true };
        const snapshot = game.snapshot();
        return {
          ...current,
          mode: saved.mode ?? current.mode,
          playerColor: saved.playerColor ?? current.playerColor,
          difficultyId: saved.difficultyId ?? current.difficultyId,
          orientation: saved.orientation ?? current.orientation,
          manualResult: saved.manualResult ?? null,
          game,
          snapshot,
          lastMove: lastMoveOf(snapshot),
          hydrated: true,
        };
      },
      // Whether or not a saved game was found, the app should stop waiting.
      onRehydrateStorage: () => () => {
        useGameStore.setState({ hydrated: true });
      },
    }
  )
);

type Setter = (partial: Partial<GameState>) => void;

function commit(set: Setter, get: () => GameState, record: MoveRecord): void {
  const snapshot = get().game.snapshot();
  set({
    snapshot,
    selected: null,
    targets: [],
    pendingPromotion: null,
    pendingClarification: null,
    lastMove: { from: record.from, to: record.to },
  });
}

function lastMoveOf(snapshot: PositionSnapshot): { from: Square; to: Square } | null {
  const last = snapshot.history[snapshot.history.length - 1];
  return last ? { from: last.from, to: last.to } : null;
}

function trim(entries: ConversationEntry[]): ConversationEntry[] {
  return entries.length > MAX_CONVERSATION ? entries.slice(-MAX_CONVERSATION) : entries;
}
