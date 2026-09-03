import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.row, { paddingVertical: spacing.md }]}>
      <View style={styles.text}>
        <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
        {hint ? (
          <Text style={[typography.caption, { color: colors.textFaint, marginTop: 2 }]}>{hint}</Text>
        ) : null}
      </View>
      {children ? <View style={{ marginLeft: spacing.md }}>{children}</View> : null}
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange(next: boolean): void;
}) {
  const { colors } = useTheme();
  return (
    <SettingRow label={label} hint={hint}>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor={colors.surface}
      />
    </SettingRow>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { flex: 1 },
});
