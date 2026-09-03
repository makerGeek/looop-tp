import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLOR_NAMES } from '@/chess/board';
import { describeStatus } from '@/chess/narration';
import type { Color, GameResult, PositionSnapshot } from '@/chess/types';
import type { EngineStatus } from '@/engine/types';
import { useTheme } from '@/theme/ThemeProvider';
import { CapturedTray } from './CapturedTray';

/**
 * Everything a player glances up at mid-game: who is to move, what the engine
 * is doing, and the material score for both sides.
 */
export function GameHeader({
  snapshot,
  result,
  orientation,
  opponentLabel,
  engineStatus,
  isThinking,
  onBack,
}: {
  snapshot: PositionSnapshot;
  result: GameResult | null;
  orientation: Color;
  opponentLabel: string;
  engineStatus: EngineStatus;
  isThinking: boolean;
  onBack(): void;
}) {
  const { colors, spacing, typography } = useTheme();
  const top: Color = orientation === 'w' ? 'b' : 'w';
  const bottom: Color = orientation;

  const status = result ? describeStatus({ ...snapshot, result }) : describeStatus(snapshot);
  const engineLine = engineLabel(engineStatus, isThinking);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to menu" hitSlop={12}>
          <Text style={[typography.label, { color: colors.textMuted }]}>‹ Menu</Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textFaint }]}>{engineLine}</Text>
      </View>

      <View style={styles.seatRow}>
        <Text style={[typography.label, { color: colors.textMuted }]}>
          {top === 'w' ? 'White' : 'Black'}
          {opponentLabel ? ` · ${opponentLabel}` : ''}
        </Text>
        <CapturedTray
          pieces={snapshot.captured[top]}
          capturedBy={top}
          advantage={top === 'w' ? snapshot.materialBalance : -snapshot.materialBalance}
        />
      </View>

      <Text style={[typography.heading, { color: result ? colors.accent : colors.text }]}>{status}</Text>

      <View style={styles.seatRow}>
        <Text style={[typography.label, { color: colors.textMuted }]}>
          {COLOR_NAMES[bottom]} · you
        </Text>
        <CapturedTray
          pieces={snapshot.captured[bottom]}
          capturedBy={bottom}
          advantage={bottom === 'w' ? snapshot.materialBalance : -snapshot.materialBalance}
        />
      </View>
    </View>
  );
}

function engineLabel(status: EngineStatus, isThinking: boolean): string {
  if (isThinking) return 'Thinking…';
  switch (status.state) {
    case 'loading':
      return 'Starting engine…';
    case 'ready':
      return status.kind === 'stockfish' ? status.name : 'Built-in engine';
    case 'thinking':
      return 'Thinking…';
    case 'failed':
      return 'Engine unavailable';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
