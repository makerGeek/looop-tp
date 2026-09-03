import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isLightSquare } from '@/chess/board';
import type { Square as SquareName } from '@/chess/types';
import { useTheme } from '@/theme/ThemeProvider';

export interface BoardSquareProps {
  square: SquareName;
  size: number;
  left: number;
  top: number;
  isSelected: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  /** Rendered as a dot (empty square) or a ring (capture). */
  target: 'none' | 'move' | 'capture';
  fileLabel?: string;
  rankLabel?: string;
  onPress(square: SquareName): void;
}

function BoardSquareComponent({
  square,
  size,
  left,
  top,
  isSelected,
  isLastMove,
  isCheck,
  target,
  fileLabel,
  rankLabel,
  onPress,
}: BoardSquareProps) {
  const { colors } = useTheme();
  const light = isLightSquare(square);
  const background = light ? colors.boardLight : colors.boardDark;
  const labelColor = light ? colors.boardDark : colors.boardLight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Square ${square}`}
      onPress={() => onPress(square)}
      style={[styles.square, { width: size, height: size, left, top, backgroundColor: background }]}
    >
      {isLastMove ? <View style={[styles.fill, { backgroundColor: colors.lastMove }]} /> : null}
      {isCheck ? <View style={[styles.fill, { backgroundColor: colors.checkGlow }]} /> : null}
      {isSelected ? <View style={[styles.fill, { backgroundColor: colors.selected }]} /> : null}

      {target === 'move' ? (
        <View
          style={[
            styles.dot,
            { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, backgroundColor: colors.legalDot },
          ]}
        />
      ) : null}
      {target === 'capture' ? (
        <View
          style={[
            styles.ring,
            {
              width: size * 0.92,
              height: size * 0.92,
              borderRadius: size * 0.46,
              borderWidth: size * 0.07,
              borderColor: colors.legalDot,
            },
          ]}
        />
      ) : null}

      {rankLabel ? <Text style={[styles.rank, { color: labelColor }]}>{rankLabel}</Text> : null}
      {fileLabel ? <Text style={[styles.file, { color: labelColor }]}>{fileLabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  square: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dot: { position: 'absolute' },
  ring: { position: 'absolute', backgroundColor: 'transparent' },
  rank: { position: 'absolute', top: 2, left: 3, fontSize: 9, fontWeight: '700', opacity: 0.75 },
  file: { position: 'absolute', bottom: 1, right: 3, fontSize: 9, fontWeight: '700', opacity: 0.75 },
});

export const BoardSquare = memo(BoardSquareComponent);
