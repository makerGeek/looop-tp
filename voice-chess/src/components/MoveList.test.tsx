import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ChessGame } from '@/chess/rules';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MoveList } from './MoveList';

function gameAfter(sans: string[]) {
  const game = new ChessGame();
  sans.forEach((san) => game.tryMove(san));
  return game.snapshot().history;
}

describe('MoveList', () => {
  it('invites a first move when the game is empty', async () => {
    await render(
      <ThemeProvider>
        <MoveList history={[]} />
      </ThemeProvider>
    );
    expect(screen.getByText(/no moves yet/i)).toBeTruthy();
  });

  it('pairs White and Black under one move number', async () => {
    await render(
      <ThemeProvider>
        <MoveList history={gameAfter(['e4', 'e5', 'Nf3'])} />
      </ThemeProvider>
    );

    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('2.')).toBeTruthy();
    expect(screen.getByText('e4')).toBeTruthy();
    expect(screen.getByText('e5')).toBeTruthy();
    expect(screen.getByText('Nf3')).toBeTruthy();
  });
});
