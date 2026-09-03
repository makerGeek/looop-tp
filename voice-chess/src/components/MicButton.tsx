import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { motion } from '@/theme/tokens';
import type { VoiceState } from '@/voice/useVoiceSession';

/**
 * The primary control.
 *
 * Two interaction models, chosen in Settings: hold to talk (default, matches
 * the walkie-talkie mental model most people already have) or tap to toggle
 * (better for accessibility and long thinking pauses).
 *
 * The ring tracks live input level so the player can *see* that they are being
 * heard — the single most reassuring thing a voice UI can do.
 */
export function MicButton({
  state,
  level,
  mode,
  disabled,
  onStart,
  onStop,
}: {
  state: VoiceState;
  level: number;
  mode: 'push-to-talk' | 'tap-to-toggle';
  disabled?: boolean;
  onStart(): void;
  onStop(): void;
}) {
  const { colors, typography, spacing } = useTheme();
  const listening = state === 'listening';
  const busy = state === 'transcribing' || state === 'understanding';

  const pulse = useSharedValue(0);
  const amplitude = useSharedValue(0);

  useEffect(() => {
    amplitude.value = withSpring(listening ? level : 0, { damping: 18, stiffness: 180 });
  }, [amplitude, level, listening]);

  useEffect(() => {
    if (busy) {
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 620 }), withTiming(0, { duration: 620 })),
        -1,
        false
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, motion.quick);
    }
  }, [busy, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + amplitude.value * 0.35 + pulse.value * 0.12 }],
    opacity: 0.18 + amplitude.value * 0.4 + pulse.value * 0.25,
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + amplitude.value * 0.06 }],
  }));

  const color = listening ? colors.listening : busy ? colors.warning : colors.accent;

  const pressHandlers =
    mode === 'push-to-talk'
      ? { onPressIn: onStart, onPressOut: onStop }
      : { onPress: listening ? onStop : onStart };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { backgroundColor: color }, ringStyle]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : 'Speak your move'}
        accessibilityHint={
          mode === 'push-to-talk' ? 'Hold to talk, release when you are done' : 'Tap to start, tap again to send'
        }
        accessibilityState={{ disabled, busy }}
        disabled={disabled}
        testID="mic-button"
        {...pressHandlers}
      >
        <Animated.View style={[styles.core, { backgroundColor: color, opacity: disabled ? 0.4 : 1 }, coreStyle]}>
          <MicIcon color={colors.accentText} />
        </Animated.View>
      </Pressable>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
        {captionFor(state, mode)}
      </Text>
    </View>
  );
}

function captionFor(state: VoiceState, mode: 'push-to-talk' | 'tap-to-toggle'): string {
  switch (state) {
    case 'listening':
      return mode === 'push-to-talk' ? 'Listening — release to send' : 'Listening — tap to send';
    case 'transcribing':
      return 'Hearing you out…';
    case 'understanding':
      return 'Working it out…';
    case 'unavailable':
      return 'Voice unavailable';
    case 'error':
      return 'Tap to try again';
    default:
      return mode === 'push-to-talk' ? 'Hold to speak' : 'Tap to speak';
  }
}

/** Drawn inline so the app carries no icon-font dependency. */
function MicIcon({ color }: { color: string }) {
  return (
    <View style={styles.icon}>
      <View style={[styles.capsule, { backgroundColor: color }]} />
      <View style={[styles.arc, { borderColor: color }]} />
      <View style={[styles.stem, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', top: 0, width: 76, height: 76, borderRadius: 38 },
  core: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 28, height: 34, alignItems: 'center' },
  capsule: { width: 12, height: 18, borderRadius: 6 },
  arc: {
    width: 22,
    height: 11,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    borderWidth: 2,
    borderTopWidth: 0,
    marginTop: 3,
  },
  stem: { width: 2, height: 5, marginTop: 1 },
});
