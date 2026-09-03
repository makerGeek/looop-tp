import { useCallback, useEffect, useRef, useState } from 'react';

import { announceOpponentMove } from '@/chess/narration';
import { COLOR_NAMES } from '@/chess/board';
import { selectIsGameOver, useGameStore } from '@/state/gameStore';
import { useEngine } from './EngineProvider';
import { findDifficulty } from './difficulty';

/**
 * Drives the CPU's side of the game.
 *
 * Kept as a hook rather than baked into the store so the store stays a plain,
 * synchronously-testable state machine. This is the only place that connects
 * "it is the engine's turn" to "ask the engine".
 */

/** A move that lands instantly reads as a glitch, so give it a beat. */
const MINIMUM_THINK_MS = 450;

export function useCpuTurn({ say }: { say(text: string): Promise<void> | void }) {
  const engine = useEngine();
  const mode = useGameStore((state) => state.mode);
  const playerColor = useGameStore((state) => state.playerColor);
  const difficultyId = useGameStore((state) => state.difficultyId);
  const fen = useGameStore((state) => state.snapshot.fen);
  const turn = useGameStore((state) => state.snapshot.turn);
  const gameOver = useGameStore(selectIsGameOver);

  const [isThinking, setIsThinking] = useState(false);
  /** Guards against re-entering a search for a position we're already on. */
  const searchingFen = useRef<string | null>(null);
  // Held in a ref so a new `say` identity each render doesn't restart a search.
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  }, [say]);

  useEffect(() => {
    if (mode !== 'cpu' || gameOver || turn === playerColor) return;
    if (searchingFen.current === fen) return;

    searchingFen.current = fen;
    setIsThinking(true);
    let cancelled = false;

    const preset = findDifficulty(difficultyId);
    const startedAt = Date.now();

    (async () => {
      try {
        const result = await engine.search({
          fen,
          movetimeMs: preset.movetimeMs,
          skill: preset.skill,
          targetElo: preset.targetElo,
        });
        if (cancelled) return;

        const elapsed = Date.now() - startedAt;
        if (elapsed < MINIMUM_THINK_MS) await delay(MINIMUM_THINK_MS - elapsed);
        if (cancelled) return;

        const store = useGameStore.getState();
        // Engine output is a suggestion like any other; the store validates it.
        const outcome = store.applyEngineMove(result.bestMove);
        if (outcome.status !== 'played') {
          store.say('My engine suggested something impossible. Your move stands.', 'error');
          return;
        }

        const line = announceOpponentMove(outcome.move, COLOR_NAMES[outcome.move.color]);
        store.say(line);
        await sayRef.current(line);
      } catch (error) {
        if (cancelled) return;
        useGameStore
          .getState()
          .say(`The engine couldn't find a move: ${(error as Error).message}`, 'error');
      } finally {
        if (!cancelled) setIsThinking(false);
      }
    })();

    return () => {
      cancelled = true;
      setIsThinking(false);
    };
  }, [difficultyId, engine, fen, gameOver, mode, playerColor, turn]);

  /** Asks the engine for a suggestion for the *player's* side. */
  const requestHint = useCallback(async (): Promise<string | null> => {
    const store = useGameStore.getState();
    if (selectIsGameOver(store)) return null;
    try {
      const result = await engine.search({
        fen: store.snapshot.fen,
        movetimeMs: 600,
        skill: 20,
      });
      const match = store.snapshot.legalMoves.find(
        (move) => `${move.from}${move.to}${move.promotion ?? ''}` === result.bestMove
      );
      return match?.san ?? null;
    } catch {
      return null;
    }
  }, [engine]);

  return { isThinking, requestHint, engineStatus: engine.status };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
