/**
 * Regression test for the bug that broke the app's headline feature: you made
 * a move and the CPU never replied.
 *
 * The cause was a feedback loop, not a chess problem. `useCpuTurn` depended on
 * the whole engine context object; `search()` sets a `thinking` status, which
 * re-memoised that object, which re-ran the effect, whose cleanup cancelled
 * the search it had just started. Nothing ever completed.
 *
 * Every other test mocked or bypassed the engine, so none of them saw it.
 */
import { act, renderHook } from '@testing-library/react-native';
import React from 'react';

import { EngineProvider } from './EngineProvider';
import { useCpuTurn } from './useCpuTurn';
import { useGameStore } from '@/state/gameStore';

const say = jest.fn(async (_line: string) => undefined);

function wrapper({ children }: { children: React.ReactNode }) {
  return <EngineProvider>{children}</EngineProvider>;
}

/** Waits for the CPU to reply, or gives up so a failure is a failure. */
async function waitForReply(plies: number, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (useGameStore.getState().snapshot.history.length >= plies) return true;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  }
  return false;
}

beforeEach(() => {
  jest.clearAllMocks();
  useGameStore.getState().newGame({ mode: 'cpu', playerColor: 'w', difficultyId: 'casual' });
});

describe('useCpuTurn', () => {
  it('replies after the player moves', async () => {
    await renderHook(() => useCpuTurn({ say }), { wrapper });

    await act(async () => {
      useGameStore.getState().applyMove({ from: 'e2', to: 'e4' });
    });

    expect(await waitForReply(2)).toBe(true);

    const history = useGameStore.getState().snapshot.history;
    expect(history).toHaveLength(2);
    expect(history[0]!.san).toBe('e4');
    expect(history[1]!.color).toBe('b');
    expect(useGameStore.getState().snapshot.turn).toBe('w');
  }, 40_000);

  it('announces the move it played', async () => {
    await renderHook(() => useCpuTurn({ say }), { wrapper });

    await act(async () => {
      useGameStore.getState().applyMove({ from: 'd2', to: 'd4' });
    });
    expect(await waitForReply(2)).toBe(true);

    expect(say).toHaveBeenCalled();
    const spoken = say.mock.calls.map((call) => String(call[0])).join(' ');
    expect(spoken).toMatch(/black/i);
  }, 40_000);

  it('keeps replying over several moves', async () => {
    await renderHook(() => useCpuTurn({ say }), { wrapper });

    for (const move of [{ from: 'e2', to: 'e4' }, { from: 'g1', to: 'f3' }] as const) {
      const before = useGameStore.getState().snapshot.history.length;
      await act(async () => {
        useGameStore.getState().applyMove(move);
      });
      expect(await waitForReply(before + 2)).toBe(true);
    }

    expect(useGameStore.getState().snapshot.history).toHaveLength(4);
  }, 60_000);

  it('does not move for the player in pass-and-play', async () => {
    useGameStore.getState().newGame({ mode: 'pass-and-play', playerColor: 'w', difficultyId: 'casual' });
    await renderHook(() => useCpuTurn({ say }), { wrapper });

    await act(async () => {
      useGameStore.getState().applyMove({ from: 'e2', to: 'e4' });
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });

    expect(useGameStore.getState().snapshot.history).toHaveLength(1);
  }, 20_000);
});
