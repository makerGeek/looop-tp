import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps {
  label: string;
  onPress(): void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  style,
  testID,
}: ButtonProps) {
  const { colors, radius, typography, spacing } = useTheme();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
    opacity: 1 - pressed.value * 0.15,
  }));

  const palette = {
    primary: { background: colors.accent, text: colors.accentText, border: 'transparent' },
    secondary: { background: colors.surfaceAlt, text: colors.text, border: colors.border },
    ghost: { background: 'transparent', text: colors.textMuted, border: 'transparent' },
    danger: { background: 'transparent', text: colors.danger, border: colors.danger },
  }[variant];

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => (pressed.value = withTiming(1, motion.quick))}
      onPressOut={() => (pressed.value = withTiming(0, motion.quick))}
      style={[
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: radius.md,
          paddingVertical: size === 'lg' ? spacing.lg : spacing.md,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.45 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
          <Text style={[typography.label, { color: palette.text }]}>{label}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: { flexDirection: 'row', alignItems: 'center' },
});
