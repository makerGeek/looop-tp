/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Jest environment for a React Native app.
 *
 * The domain layer (`src/chess`, `src/voice`, `src/engine`, `src/state`) is
 * plain TypeScript and needs none of this. These mocks exist purely so the
 * *presentational* tests can render real components without a device.
 */

// Reanimated 4 boots a worklets runtime that has no native counterpart under
// Jest — and its own shipped mock imports that runtime, so it can't be used.
// This double renders animated components as ordinary views and turns every
// animation helper into an identity function, which is exactly what a render
// assertion wants.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, ScrollView, Image, FlatList } = require('react-native');

  const passthrough = (Component) => {
    const Wrapped = React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }));
    Wrapped.displayName = `Animated(${Component.displayName || Component.name || 'Component'})`;
    return Wrapped;
  };

  /** Layout animations are used fluently: `FadeIn.duration(200).springify()`. */
  const chainable = () =>
    new Proxy(function () {}, {
      get: () => chainable(),
      apply: () => chainable(),
    });

  const Animated = {
    View: passthrough(View),
    Text: passthrough(Text),
    ScrollView: passthrough(ScrollView),
    Image: passthrough(Image),
    FlatList: passthrough(FlatList),
    createAnimatedComponent: passthrough,
  };

  const identity = (value) => value;

  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: (factory) => {
      try {
        return factory();
      } catch {
        return {};
      }
    },
    useAnimatedRef: () => ({ current: null }),
    // react-native-gesture-handler reaches into Reanimated for these when a
    // GestureDetector mounts.
    useEvent: () => () => {},
    useHandler: () => ({ context: {}, doDependenciesDiffer: false, useWeb: false }),
    useComposedEventHandler: () => () => {},
    setGestureState: () => {},
    useDerivedValue: (factory) => ({ value: factory() }),
    withSpring: identity,
    withTiming: identity,
    withDelay: (_delay, value) => value,
    withSequence: (...values) => values[values.length - 1],
    withRepeat: identity,
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    interpolate: () => 0,
    Easing: new Proxy({}, { get: () => () => 0 }),
    FadeIn: chainable(),
    FadeOut: chainable(),
    FadeInUp: chainable(),
    FadeInDown: chainable(),
    SlideInRight: chainable(),
    Layout: chainable(),
  };
});

require('react-native-gesture-handler/jestSetup');

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  isSpeakingAsync: jest.fn(async () => false),
}));
