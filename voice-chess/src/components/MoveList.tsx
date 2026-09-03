import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { MoveRecord } from '@/chess/types';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The score sheet, laid out as numbered pairs and scrolled to the live move.
 */
export function MoveList({ history }: { history: MoveRecord[] }) {
  const { colors, spacing, typography, radius } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const rows = useMemo(() => {
    const grouped: { number: number; white?: MoveRecord; black?: MoveRecord }[] = [];
    history.forEach((move) => {
      if (move.color === 'w') {
        grouped.push({ number: move.moveNumber, white: move });
      } else {
        const last = grouped[grouped.length - 1];
        if (last && !last.black) last.black = move;
        else grouped.push({ number: move.moveNumber, black: move });
      }
    });
    return grouped;
  }, [history]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [history.length]);

  if (rows.length === 0) {
    return (
      <Text style={[typography.caption, { color: colors.textFaint }]}>
        No moves yet — say one, or tap a piece.
      </Text>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
    >
      {rows.map((row) => (
        <View
          key={`${row.number}-${row.white?.san ?? ''}`}
          style={[
            styles.pair,
            { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textFaint }]}>{row.number}.</Text>
          <Text style={[typography.mono, { color: colors.text, marginLeft: 4 }]}>{row.white?.san ?? '…'}</Text>
          {row.black ? (
            <Text style={[typography.mono, { color: colors.textMuted, marginLeft: 6 }]}>{row.black.san}</Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
});
