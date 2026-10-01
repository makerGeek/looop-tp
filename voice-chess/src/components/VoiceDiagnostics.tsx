import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * A live read-out of what the detector is hearing.
 *
 * Voice problems are almost impossible to report usefully — "it keeps cutting
 * me off" could be the threshold, the noise floor, the microphone gain or the
 * transcription. This turns the complaint into numbers: the room's level, where
 * the gate sits, and what the last clip actually contained.
 *
 * It samples a ref on its own clock rather than rendering from state, because
 * the underlying values change ten times a second and re-rendering the game
 * screen at that rate to animate a debug panel would be absurd.
 */
export interface VoiceDiagnosticsValues {
  level: number;
  floor: number;
  clipMs: number;
  latencyMs: number;
}

const REFRESH_MS = 200;

export function VoiceDiagnostics({
  values,
  openMargin,
  transcript,
}: {
  values: { current: VoiceDiagnosticsValues };
  openMargin: number;
  transcript: string | null;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [shown, setShown] = useState<VoiceDiagnosticsValues>(values.current);

  useEffect(() => {
    const timer = setInterval(() => setShown({ ...values.current }), REFRESH_MS);
    return () => clearInterval(timer);
  }, [values]);

  const speaking = shown.level > shown.floor + openMargin;

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm },
      ]}
    >
      <View style={styles.row}>
        <Reading label="level" value={`${shown.level.toFixed(0)} dB`} colors={colors} typography={typography} />
        <Reading label="floor" value={`${shown.floor.toFixed(0)} dB`} colors={colors} typography={typography} />
        <Reading
          label="opens at"
          value={`${(shown.floor + openMargin).toFixed(0)} dB`}
          colors={colors}
          typography={typography}
        />
        <Reading
          label="gate"
          value={speaking ? 'open' : 'shut'}
          colors={colors}
          typography={typography}
          accent={speaking ? colors.listening : undefined}
        />
      </View>
      <View style={styles.row}>
        <Reading
          label="last clip"
          value={shown.clipMs ? `${(shown.clipMs / 1000).toFixed(1)}s` : '—'}
          colors={colors}
          typography={typography}
        />
        <Reading
          label="round trip"
          value={shown.latencyMs ? `${(shown.latencyMs / 1000).toFixed(1)}s` : '—'}
          colors={colors}
          typography={typography}
        />
      </View>
      <Text numberOfLines={1} style={[typography.caption, { color: colors.textMuted }]}>
        heard: {transcript ? `“${transcript}”` : '—'}
      </Text>
    </View>
  );
}

function Reading({
  label,
  value,
  colors,
  typography,
  accent,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  accent?: string;
}) {
  return (
    <View style={styles.reading}>
      <Text style={[typography.caption, { color: colors.textFaint }]}>{label}</Text>
      <Text style={[typography.caption, { color: accent ?? colors.text, fontVariant: ['tabular-nums'] }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  reading: { alignItems: 'flex-start' },
});
