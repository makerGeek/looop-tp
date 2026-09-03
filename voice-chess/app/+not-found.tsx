import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export default function NotFoundScreen() {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.xl }]}>
      <Text style={[typography.title, { color: colors.text }]}>Off the board</Text>
      <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
        That screen doesn’t exist.
      </Text>
      <Link href="/" style={{ marginTop: spacing.lg }}>
        <Text style={[typography.label, { color: colors.accent }]}>Back to the menu</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
