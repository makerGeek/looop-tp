import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function Card({
  children,
  title,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {title ? (
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.md }]}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
