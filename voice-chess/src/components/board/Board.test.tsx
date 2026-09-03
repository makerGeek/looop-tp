import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ChessGame } from '@/chess/rules';
import type { Square } from '@/chess/types';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { Board } from './Board';

async function renderBoard(overrides: Partial<React.ComponentProps<typeof Board>> = {}) {
  const game = new ChessGame();
  const onSquarePress = jest.fn();
  const onDrop = jest.fn();

  const utils = await render(
    <ThemeProvider>
      <Board
        size={320}
        snapshot={game.snapshot()}
        orientation="w"
        selected={null}
        targets={[]}
        lastMove={null}
        showCoordinates
        showLegalMoves
        interactive
        onSquarePress={onSquarePress}
        onDrop={onDrop}
        {...overrides}
      />
    </ThemeProvider>
  );

  return { ...utils, onSquarePress, onDrop, game };
}

describe('Board', () => {
  it('renders all sixty-four squares', async () => {
    await renderBoard();
    expect(screen.getAllByLabelText(/^Square [a-h][1-8]$/)).toHaveLength(64);
  });

  it('renders the thirty-two starting pieces', async () => {
    await renderBoard();
    expect(screen.getAllByLabelText(/(White|Black) [pnbrqk] on [a-h][1-8]/)).toHaveLength(32);
  });

  it('reports square presses upwards', async () => {
    const { onSquarePress } = await renderBoard();
    await fireEvent.press(screen.getByLabelText('Square e2'));
    expect(onSquarePress).toHaveBeenCalledWith('e2');
  });

  it('renders a position given as a FEN, not just the start', async () => {
    const game = ChessGame.fromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    await renderBoard({ snapshot: game!.snapshot() });
    expect(screen.getAllByLabelText(/(White|Black) k on [a-h][1-8]/)).toHaveLength(2);
  });

  it('flips with the orientation without changing the position', async () => {
    await renderBoard({ orientation: 'b' });
    // Every square still exists; only their screen positions changed.
    expect(screen.getAllByLabelText(/^Square [a-h][1-8]$/)).toHaveLength(64);
    expect(screen.getByLabelText('White p on e2')).toBeTruthy();
  });

  it('renders whether or not legal-move hints are enabled', async () => {
    const game = new ChessGame();
    const targets = game.legalMovesFrom('e2' as Square);

    const withHints = await renderBoard({ selected: 'e2', targets });
    expect(withHints.toJSON()).toBeTruthy();
    await withHints.unmount();

    await renderBoard({ selected: 'e2', targets, showLegalMoves: false });
    expect(screen.getAllByLabelText(/^Square [a-h][1-8]$/)).toHaveLength(64);
  });
});
