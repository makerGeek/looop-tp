import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { PromotionSheet } from './PromotionSheet';

describe('PromotionSheet', () => {
  it('offers all four promotion pieces', async () => {
    await render(
      <ThemeProvider>
        <PromotionSheet visible color="w" square="e8" onChoose={jest.fn()} onCancel={jest.fn()} />
      </ThemeProvider>
    );

    ['Queen', 'Rook', 'Bishop', 'Knight'].forEach((name) => {
      expect(screen.getByLabelText(`Promote to ${name}`)).toBeTruthy();
    });
  });

  it('reports the chosen piece by its chess symbol', async () => {
    const onChoose = jest.fn();
    await render(
      <ThemeProvider>
        <PromotionSheet visible color="b" square="a1" onChoose={onChoose} onCancel={jest.fn()} />
      </ThemeProvider>
    );

    await fireEvent.press(screen.getByLabelText('Promote to Knight'));
    expect(onChoose).toHaveBeenCalledWith('n');
  });

  it('renders nothing when hidden', async () => {
    await render(
      <ThemeProvider>
        <PromotionSheet visible={false} color="w" square={null} onChoose={jest.fn()} onCancel={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.queryByLabelText('Promote to Queen')).toBeNull();
  });
});
