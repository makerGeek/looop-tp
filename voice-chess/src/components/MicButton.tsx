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

import type { VoiceMode } from '@/state/settingsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { motion } from '@/theme/tokens';
import type { VoiceState } from '@/voice/useVoiceSession';

/**
 * The primary control.
 *
 * Three interaction models, chosen in Settings: hold to talk (default, matches
 * the walkie-talkie mental model most people already have), tap to toggle
 * (better for accessibility and long thinking pauses), or continuous — one tap
 * hands the microphone over for the rest of the game.
 *
 * The ring tracks live input level so the player can *see* that they are being
 * heard — the single most reassuring thing a voice UI can do. In continuous
 * mode it is doing double duty: it is also the only evidence that the app is
 * still listening rather than quietly broken.
 */
export function MicButton({
  state,
  level,
  mode,
  active,
  disabled,
  onStart,
  onStop,
}: {
  state: VoiceState;
  level: number;
  mode: VoiceMode;
  /** Continuous mode: whether a session is running. Ignored by the other two. */
  active?: boolean;
  disabled?: boolean;
  onStart(): void;
  onStop(): void;
}) {
  const { colors } = useTheme();
  const continuous = mode === 'continuous';
  const listening = state === 'listening';
  const busy = state === 'transcribing' || state === 'understanding';
  // In continuous mode the session outlives any one utterance, so "on" is the
  // session, not the recorder — otherwise the button would appear to switch
  // itself off every time the app spoke.
  const on = continuous ? Boolean(active) : listening;

  const pulse = useSharedValue(0);
  const amplitude = useSharedValue(0);

  useEffect(() => {
    amplitude.value = withSpring(listening ? level : 0, { damping: 18, stiffness: 180 });
  }, [amplitude, level, listening]);

  useEffect(() => {
    // A slow breath while the session is live but the microphone is shut, so
    // continuous mode never looks like it has stopped working.
    if (busy || (continuous && state === 'paused')) {
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 620 }), withTiming(0, { duration: 620 })),
        -1,
        false
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, motion.quick);
    }
  }, [busy, continuous, pulse, state]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + amplitude.value * 0.35 + pulse.value * 0.12 }],
    opacity: 0.18 + amplitude.value * 0.4 + pulse.value * 0.25,
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + amplitude.value * 0.06 }],
  }));

  const color = on ? colors.listening : busy ? colors.warning : colors.accent;

  const pressHandlers =
    mode === 'push-to-talk'
      ? { onPressIn: onStart, onPressOut: onStop }
      : { onPress: on ? onStop : onStart };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { backgroundColor: color }, ringStyle]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabelFor(mode, on)}
        accessibilityHint={ACCESSIBILITY_HINTS[mode]}
        accessibilityState={{ disabled, busy }}
        disabled={disabled}
        testID="mic-button"
        {...pressHandlers}
      >
        <Animated.View style={[styles.core, { backgroundColor: color, opacity: disabled ? 0.4 : 1 }, coreStyle]}>
          <MicIcon color={colors.accentText} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/**
 * The caption lives outside the button, on a line of its own.
 *
 * It used to sit under the mic, which made the whole control as wide as
 * whatever it happened to say — and the control sits in a row between two
 * button columns. A longer caption quietly stole their space and crowded them
 * against it. Captions change with state; the layout must not.
 */
export function MicCaption({
  state,
  mode,
  active,
}: {
  state: VoiceState;
  mode: VoiceMode;
  active?: boolean;
}) {
  const { colors, typography } = useTheme();
  const on = mode === 'continuous' ? Boolean(active) : state === 'listening';

  return (
    <Text
      numberOfLines={1}
      style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}
    >
      {captionFor(state, mode, on)}
    </Text>
  );
}

const ACCESSIBILITY_HINTS: Record<VoiceMode, string> = {
  'push-to-talk': 'Hold to talk, release when you are done',
  'tap-to-toggle': 'Tap to start, tap again to send',
  continuous: 'Tap to hand over the microphone, tap again to take it back',
};

function accessibilityLabelFor(mode: VoiceMode, on: boolean): string {
  if (mode === 'continuous') return on ? 'Stop always-on listening' : 'Start always-on listening';
  return on ? 'Stop listening' : 'Speak your move';
}

function captionFor(state: VoiceState, mode: VoiceMode, on: boolean): string {
  if (mode === 'continuous') {
    if (!on) return state === 'unavailable' ? 'Voice unavailable' : 'Tap to start listening';
    switch (state) {
      case 'transcribing':
        return 'Hearing you out…';
      case 'understanding':
        return 'Working it out…';
      case 'paused':
        // Not an error and not a stall: the microphone is shut on purpose,
        // because recording our own voice back is worse than a short gap.
        return 'One moment…';
      case 'error':
        return 'Something went wrong — tap to stop';
      default:
        return 'Listening — just talk';
    }
  }

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
  // Sized to the button, never to the caption.
  wrapper: { width: 76, alignItems: 'center', justifyContent: 'center' },
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
