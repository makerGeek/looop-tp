import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import type { Color, PieceSymbol } from '@/chess/types';
import { useTheme } from '@/theme/ThemeProvider';
import { PieceGlyph } from './board/PieceGlyph';

const CHOICES: PieceSymbol[] = ['q', 'r', 'b', 'n'];
const NAMES: Record<string, string> = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };

/**
 * Promotion picker.
 *
 * Shown whenever a promotion is reachable but the piece wasn't named — by tap
 * *or* by voice, which is why it lives in the store rather than in the board:
 * "pawn to e8" and dragging a pawn to e8 land in exactly the same place.
 */
export function PromotionSheet({
  visible,
  color,
  square,
  onChoose,
  onCancel,
}: {
  visible: boolean;
  color: Color;
  square: string | null;
  onChoose(piece: PieceSymbol): void;
  onCancel(): void;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancel promotion" />
        <Animated.View
          entering={FadeInDown.springify().damping(20)}
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
          ]}
        >
          <Text style={[typography.heading, { color: colors.text }]}>
            Promote on {square ?? ''}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
            Tap a piece, or just say it.
          </Text>

          <View style={[styles.options, { marginTop: spacing.lg, gap: spacing.md }]}>
            {CHOICES.map((piece) => (
              <Pressable
                key={piece}
                accessibilityRole="button"
                accessibilityLabel={`Promote to ${NAMES[piece]}`}
                onPress={() => onChoose(piece)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: pressed ? colors.accentSoft : colors.surfaceAlt,
                    borderRadius: radius.md,
                    borderColor: colors.border,
                  },
                ]}
              >
                <PieceGlyph type={piece} color={color} size={44} />
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                  {NAMES[piece]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { width: '100%', maxWidth: 420 },
  options: { flexDirection: 'row' },
  option: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth },
});
