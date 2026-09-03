import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import type { ConversationEntry } from '@/state/gameStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The running transcript.
 *
 * Showing what the app *heard* next to what it *said* is the fastest way for a
 * player to understand a misfire — "I said knight to f3, it heard night f five"
 * is instantly diagnosable, and silently guessing never is.
 */
export function ConversationLog({ entries }: { entries: ConversationEntry[] }) {
  const { colors, radius, spacing, typography } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[typography.caption, { color: colors.textFaint, textAlign: 'center' }]}>
          Say “e4”, “knight to f3”, or “what’s the position?”
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}
      showsVerticalScrollIndicator={false}
    >
      {entries.map((entry) => {
        const mine = entry.role === 'player';
        const background = mine
          ? colors.accentSoft
          : entry.tone === 'error'
            ? 'transparent'
            : colors.surfaceAlt;
        const textColor =
          entry.tone === 'error' ? colors.danger : entry.tone === 'hint' ? colors.warning : colors.text;

        return (
          <Animated.View
            key={entry.id}
            entering={FadeInUp.duration(220)}
            style={[
              styles.bubble,
              {
                alignSelf: mine ? 'flex-end' : 'flex-start',
                backgroundColor: background,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderColor: entry.tone === 'error' ? colors.danger : 'transparent',
              },
            ]}
          >
            <Text style={[typography.body, { color: textColor }]}>{entry.text}</Text>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  bubble: { maxWidth: '86%', borderWidth: StyleSheet.hairlineWidth },
});
