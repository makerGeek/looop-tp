import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Color, PieceSymbol } from '@/chess/types';
import { useTheme } from '@/theme/ThemeProvider';
import { PieceGlyph } from './board/PieceGlyph';

/**
 * The pieces one side has taken, plus the running material edge.
 *
 * Overlapped like cards in a hand so a full haul still fits on one line.
 */
export function CapturedTray({
  pieces,
  capturedBy,
  advantage,
  size = 20,
}: {
  pieces: PieceSymbol[];
  /** The colour that did the capturing — the tray shows their victims. */
  capturedBy: Color;
  /** Material edge in pawns for `capturedBy`; hidden when zero or negative. */
  advantage: number;
  size?: number;
}) {
  const { colors, typography, spacing } = useTheme();
  const victimColor: Color = capturedBy === 'w' ? 'b' : 'w';

  return (
    <View style={[styles.row, { minHeight: size + 4 }]}>
      {pieces.map((piece, index) => (
        <View key={`${piece}-${index}`} style={{ marginLeft: index === 0 ? 0 : -size * 0.42 }}>
          <PieceGlyph type={piece} color={victimColor} size={size} />
        </View>
      ))}
      {advantage > 0 ? (
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, marginLeft: pieces.length ? spacing.sm : 0 },
          ]}
        >
          +{advantage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
