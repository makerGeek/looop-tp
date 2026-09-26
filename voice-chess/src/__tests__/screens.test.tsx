import { render, screen } from '@testing-library/react-native';
import React from 'react';

/**
 * Smoke tests for the real screens.
 *
 * Every other suite exercises a slice of the app: the rules, the voice
 * pipeline, the store, individual components. None of them mount a *screen*,
 * so none of them would catch the one failure that matters most to a user —
 * the app crashing on launch because a provider is missing, a hook runs in the
 * wrong order, or a native module blows up at import time.
 *
 * These tests wire up the same provider stack `app/_layout.tsx` uses and mount
 * each route. Native modules are replaced with the thinnest possible doubles:
 * the point is to prove the React tree builds, not to re-test audio or WebViews.
 */

jest.mock('expo-router', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => children ?? null;
  Passthrough.displayName = 'Passthrough';

  const Stack = Object.assign(Passthrough, { Screen: () => null });

  return {
    Stack,
    Link: Passthrough,
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
  };
});

// The library ships its mock on `default`, so it is spread onto the module.
jest.mock('react-native-safe-area-context', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ...require('react-native-safe-area-context/jest/mock').default,
}));

// The engine host renders a WebView purely to run Stockfish; a null element is
// enough for the tree to build.
jest.mock('react-native-webview', () => ({ WebView: () => null }));

jest.mock('expo-audio', () => ({
  useAudioRecorder: () => ({
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(),
    stop: jest.fn(async () => undefined),
    uri: null,
  }),
  useAudioRecorderState: () => ({ isRecording: false, metering: undefined }),
  RecordingPresets: { HIGH_QUALITY: {}, LOW_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => undefined),
  createAudioPlayer: () => ({ play: jest.fn(), remove: jest.fn() }),
}));

jest.mock('expo-file-system', () => ({
  File: class {},
  Directory: class {},
  Paths: { cache: {}, document: {} },
  UploadType: { MULTIPART: 1, BINARY_CONTENT: 0 },
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}));

/* eslint-disable import/first */
import { EngineProvider } from '@/engine/EngineProvider';
import { useGameStore } from '@/state/gameStore';
import { ThemeProvider } from '@/theme/ThemeProvider';
import GameScreen from '../../app/game';
import HomeScreen from '../../app/index';
import SettingsScreen from '../../app/settings';
/* eslint-enable import/first */

/** The same provider stack `app/_layout.tsx` builds, minus navigation. */
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <EngineProvider>{children}</EngineProvider>
    </ThemeProvider>
  );
}

const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

beforeEach(() => {
  consoleError.mockClear();
  useGameStore.getState().newGame({ mode: 'cpu', playerColor: 'w', difficultyId: 'friendly' });
});

afterAll(() => consoleError.mockRestore());

describe('Home screen', () => {
  it('mounts and offers a new game', async () => {
    await render(
      <Providers>
        <HomeScreen />
      </Providers>
    );

    expect(screen.getByText('Voice Chess')).toBeTruthy();
    expect(screen.getByTestId('start-game')).toBeTruthy();
    expect(screen.getByText('vs CPU')).toBeTruthy();
    expect(screen.getByText('Pass & play')).toBeTruthy();
  });

  it('tells the player when voice is unavailable rather than hiding it', async () => {
    await render(
      <Providers>
        <HomeScreen />
      </Providers>
    );
    // No API key is configured in the test environment.
    expect(screen.getByText(/Add an OpenAI key to talk your moves/i)).toBeTruthy();
  });
});

describe('Game screen', () => {
  it('mounts with a full board and the controls', async () => {
    await render(
      <Providers>
        <GameScreen />
      </Providers>
    );

    expect(screen.getByTestId('chess-board')).toBeTruthy();
    expect(screen.getAllByLabelText(/^Square [a-h][1-8]$/)).toHaveLength(64);
    expect(screen.getAllByLabelText(/(White|Black) [pnbrqk] on [a-h][1-8]/)).toHaveLength(32);
    expect(screen.getByTestId('mic-button')).toBeTruthy();
    expect(screen.getByText('White to move')).toBeTruthy();
  });

  it('renders a game already in progress', async () => {
    const store = useGameStore.getState();
    store.applyMove({ from: 'e2', to: 'e4' });
    store.applyEngineMove('e7e5');

    await render(
      <Providers>
        <GameScreen />
      </Providers>
    );

    expect(screen.getByText('e4')).toBeTruthy();
    expect(screen.getByText('e5')).toBeTruthy();
    expect(screen.getByText('White to move')).toBeTruthy();
  });

  it('renders a finished game without falling over', async () => {
    const store = useGameStore.getState();
    ['f2f3', 'e7e5', 'g2g4', 'd8h4'].forEach((uci) => store.applyEngineMove(uci));

    await render(
      <Providers>
        <GameScreen />
      </Providers>
    );

    // The result shows in the header *and* is announced in the transcript.
    expect(screen.getAllByText(/Checkmate\. Black wins\./).length).toBeGreaterThanOrEqual(2);
    // Resign is swapped for a way back into a new game.
    expect(screen.getByText('New game')).toBeTruthy();
    expect(screen.queryByText('Resign')).toBeNull();
  });
});

describe('Settings screen', () => {
  it('mounts with every section', async () => {
    await render(
      <Providers>
        <SettingsScreen />
      </Providers>
    );

    ['APPEARANCE', 'VOICE', 'BOARD', 'OPENAI', 'ENGINE'].forEach((section) => {
      expect(screen.getByText(section)).toBeTruthy();
    });
    expect(screen.getByLabelText('OpenAI API key')).toBeTruthy();
  });
});

describe('no screen logs a React error while mounting', () => {
  it('stays quiet', async () => {
    await render(
      <Providers>
        <GameScreen />
      </Providers>
    );
    const errors = consoleError.mock.calls.map((call) => String(call[0]));
    expect(errors).toEqual([]);
  });
});
