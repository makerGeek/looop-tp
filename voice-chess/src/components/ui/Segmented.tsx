import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange(value: T): void;
  testID?: string;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.track,
        { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 3 },
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              {
                backgroundColor: active ? colors.surface : 'transparent',
                borderRadius: radius.sm,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[typography.label, { color: active ? colors.text : colors.textMuted }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
