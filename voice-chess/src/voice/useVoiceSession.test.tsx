/**
 * Regression tests for the microphone lifecycle.
 *
 * The push-to-talk cases here were reported from a real Android device, and
 * none was reachable through the UI tests: they only appear when the permission
 * dialog delays `start()` past the finger-release that was meant to stop it.
 *
 * The continuous-mode cases feed synthetic PCM into the real stream callback,
 * so the detector, the capture buffer and the loop all run for real. The only
 * thing faked is the microphone itself.
 */

const SAMPLE_RATE = 16_000;
/** One buffer's worth, matching what the native stream delivers. */
const BUFFER_SAMPLES = SAMPLE_RATE / 10;

interface MockStream {
  start: jest.Mock<Promise<void>, []>;
  stop: jest.Mock<void, []>;
  isStreaming: boolean;
}

const mockStream: MockStream = {
  start: jest.fn(async () => {
    mockStream.isStreaming = true;
  }),
  stop: jest.fn(() => {
    mockStream.isStreaming = false;
  }),
  isStreaming: false,
};

/** The hook's own `onBuffer`, captured so a test can drive the microphone. */
let mockOnBuffer:
  | ((buffer: { data: ArrayBuffer; sampleRate: number; channels: number }) => void)
  | null = null;
const mockUseAudioStream = jest.fn();

/** Resolves only when the test lets it, standing in for the permission dialog. */
let mockReleasePermission: (() => void) | null = null;
/** Set by the continuous tests, which need permission to be granted at once. */
let mockGrantImmediately = false;

const mockTranscribe = jest.fn(async () => ({ text: 'pawn to e4', durationMs: 10 }));
jest.mock('./transcribe', () => ({
  transcribeAudio: (...args: unknown[]) => mockTranscribe(...(args as [])),
}));

jest.mock('expo-audio', () => ({
  useAudioStream: (options: {
    onBuffer?: (buffer: { data: ArrayBuffer; sampleRate: number; channels: number }) => void;
  }) => {
    mockUseAudioStream(options);
    mockOnBuffer = options.onBuffer ?? null;
    return { stream: mockStream, isStreaming: mockStream.isStreaming };
  },
  requestRecordingPermissionsAsync: jest.fn(() => {
    if (mockGrantImmediately) return Promise.resolve({ granted: true });
    return new Promise((resolve) => {
      mockReleasePermission = () => resolve({ granted: true });
    });
  }),
  setAudioModeAsync: jest.fn(async () => undefined),
  createAudioPlayer: () => ({ play: jest.fn(), remove: jest.fn() }),
}));

jest.mock('expo-file-system', () => ({
  File: class {
    uri = 'file:///utterance.wav';
    exists = false;
    create() {}
    write() {}
    delete() {}
  },
  Directory: class {
    exists = true;
    create() {}
  },
  Paths: { cache: {}, document: {} },
  UploadType: { MULTIPART: 1 },
}));

/* eslint-disable import/first */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEFAULT_DIFFICULTY_ID } from '@/engine/difficulty';
import { useGameStore } from '@/state/gameStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useVoiceSession } from './useVoiceSession';
/* eslint-enable import/first */

/**
 * Levels in dBFS, as `rmsDbfs` would report them for a real room.
 * A sine's RMS is its peak over root two, so the amplitudes below are chosen
 * to land near these figures.
 */
const QUIET = 0.001; // amplitude: a still room, about -60 dBFS
const SPEAKING = 0.15; // about -19 dBFS — someone talking at the phone

/**
 * The detector works in wall-clock time, so pushing two seconds of audio
 * synchronously would look like two seconds arriving in one instant. Time is
 * driven by hand instead: each buffer advances the clock by its own duration.
 * Real timers are left alone, so `waitFor` and the resume poll still work.
 */
let mockNow = 1_700_000_000_000;

/** Feeds `ms` of a steady tone at `amplitude` through the hook's callback. */
function pushAudio(amplitude: number, ms: number): void {
  const buffers = Math.max(1, Math.round(ms / 100));
  for (let n = 0; n < buffers; n += 1) {
    const samples = new Int16Array(BUFFER_SAMPLES);
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = Math.round(Math.sin((i / 40) * 2 * Math.PI) * amplitude * 32767);
    }
    mockNow += 100;
    mockOnBuffer?.({ data: samples.buffer, sampleRate: SAMPLE_RATE, channels: 1 });
  }
}

const handlers = {
  say: jest.fn(async () => undefined),
  repeat: jest.fn(async () => undefined),
  silence: jest.fn(async () => undefined),
  onCommand: jest.fn(),
  onQuestion: jest.fn(),
};

beforeAll(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
});

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
  mockOnBuffer = null;
  mockStream.isStreaming = false;
  mockReleasePermission = null;
  mockGrantImmediately = false;
  mockTranscribe.mockResolvedValue({ text: 'pawn to e4', durationMs: 10 });
  useSettingsStore.setState({ voiceMode: 'push-to-talk' });
  // A key must be present, or `start` bails before ever touching the mockRecorder.
  await useSettingsStore.getState().setApiKey('sk-test-key');
});

afterAll(async () => {
  await useSettingsStore.getState().setApiKey(null);
});

describe('microphone lifecycle', () => {
  it('does not leave the microphone open when the press ends during startup', async () => {
    const { result } = await renderHook(() => useVoiceSession(handlers));

    // Press: `start` suspends on the permission dialog.
    await act(async () => {
      result.current.start();
    });
    // Release, while the dialog is still up.
    await act(async () => {
      await result.current.stop();
    });
    // Permission finally comes back.
    await act(async () => {
      mockReleasePermission?.();
      await Promise.resolve();
    });

    expect(mockStream.start).not.toHaveBeenCalled();
    expect(mockStream.isStreaming).toBe(false);
  });

  it('records normally when the press outlasts the permission dialog', async () => {
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      result.current.start();
    });
    await act(async () => {
      mockReleasePermission?.();
      await Promise.resolve();
    });

    expect(mockStream.start).toHaveBeenCalledTimes(1);
    expect(mockStream.isStreaming).toBe(true);
    expect(result.current.state).toBe('listening');
  });

  it('ignores a second press while the first is still opening the microphone', async () => {
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      result.current.start();
      result.current.start();
    });
    await act(async () => {
      mockReleasePermission?.();
      await Promise.resolve();
    });

    expect(mockStream.start).toHaveBeenCalledTimes(1);
  });

  it('sends what was said between the press and the release', async () => {
    mockGrantImmediately = true;
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      pushAudio(SPEAKING, 600);
    });
    await act(async () => {
      await result.current.stop();
    });

    expect(mockTranscribe).toHaveBeenCalledTimes(1);
    expect(mockStream.stop).toHaveBeenCalled();
  });
});

describe('capture configuration', () => {
  it('asks the stream for 16 kHz mono PCM', async () => {
    // What transcription models want. The old path recorded 44.1 kHz stereo
    // AAC, which is larger, slower to upload and no more accurate.
    await renderHook(() => useVoiceSession(handlers));

    expect(mockUseAudioStream).toHaveBeenCalledWith(
      expect.objectContaining({ sampleRate: 16_000, channels: 1, encoding: 'int16' })
    );
  });
});

describe('continuous listening', () => {
  const passes = (ms: number) =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });

  beforeEach(() => {
    mockGrantImmediately = true;
    useSettingsStore.setState({ voiceMode: 'continuous', useModelFallback: false });
    useGameStore.getState().newGame({
      mode: 'pass-and-play',
      playerColor: 'w',
      difficultyId: DEFAULT_DIFFICULTY_ID,
    });
  });

  afterEach(async () => {
    await act(async () => {
      useSettingsStore.setState({ voiceMode: 'push-to-talk', useModelFallback: true });
    });
  });

  it('opens the microphone once and keeps it open without a finger on it', async () => {
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.active).toBe(true);
    expect(mockStream.start).toHaveBeenCalledTimes(1);

    // Two seconds of a quiet room: still listening, nothing sent.
    await act(async () => {
      pushAudio(QUIET, 2_000);
    });
    expect(mockStream.isStreaming).toBe(true);
    expect(mockTranscribe).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.stop();
    });
    expect(result.current.active).toBe(false);
  });

  it('transcribes a sentence when it ends, then reopens for the next one', async () => {
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      await result.current.start();
    });
    // Warmup, so the floor is learnt from the quiet room.
    await act(async () => {
      pushAudio(QUIET, 500);
    });

    await act(async () => {
      pushAudio(SPEAKING, 700);
    });
    expect(mockTranscribe).not.toHaveBeenCalled();

    await act(async () => {
      pushAudio(QUIET, 1_200);
    });

    await waitFor(() => expect(mockTranscribe).toHaveBeenCalledTimes(1), { timeout: 3_000 });

    // The move reached the board through the normal pipeline.
    await waitFor(() => expect(useGameStore.getState().snapshot.history).toHaveLength(1));
    expect(useGameStore.getState().snapshot.history[0].san).toBe('e4');

    // The microphone was released for the round trip, then taken back.
    expect(mockStream.stop).toHaveBeenCalled();
    await waitFor(() => expect(mockStream.start.mock.calls.length).toBeGreaterThan(1), {
      timeout: 3_000,
    });
    expect(result.current.active).toBe(true);

    await act(async () => {
      await result.current.stop();
    });
  });

  it('sends a clip that begins before the speech did', async () => {
    // The pre-roll is the whole reason clips are built by hand: without it the
    // first syllable is missing, and in chess that is usually the piece.
    const { result } = await renderHook(() => useVoiceSession(handlers));
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      pushAudio(QUIET, 500);
    });
    await act(async () => {
      pushAudio(SPEAKING, 700);
      pushAudio(QUIET, 1_200);
    });

    await waitFor(() => expect(mockTranscribe).toHaveBeenCalledTimes(1), { timeout: 3_000 });
    // 700ms of speech, and the clip is longer than that.
    expect(result.current.diagnostics.current.clipMs).toBeGreaterThan(700);

    await act(async () => {
      await result.current.stop();
    });
  });

  it('does not spend a transcription on a cough', async () => {
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      pushAudio(QUIET, 500);
      pushAudio(SPEAKING, 100); // far under the minimum speech length
      pushAudio(QUIET, 1_500);
    });

    expect(mockTranscribe).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.stop();
    });
  });

  it('does not spend a transcription on a steady noise', async () => {
    // Flat and loud: a fan or a passing lorry, not a person.
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      pushAudio(QUIET, 500);
      pushAudio(SPEAKING, 3_000); // unvarying for three seconds
      pushAudio(QUIET, 1_200);
    });

    expect(mockTranscribe).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.stop();
    });
  });

  it('shuts the microphone while the engine is about to talk', async () => {
    let thinking = false;
    const { result } = await renderHook(() =>
      useVoiceSession({ ...handlers, isBusy: () => thinking })
    );

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      pushAudio(QUIET, 400);
    });
    expect(mockStream.isStreaming).toBe(true);

    thinking = true;
    await act(async () => {
      pushAudio(QUIET, 200);
    });
    await waitFor(() => expect(result.current.state).toBe('paused'), { timeout: 2_000 });
    expect(mockStream.isStreaming).toBe(false);

    // …and takes it back afterwards.
    thinking = false;
    await waitFor(() => expect(result.current.state).toBe('listening'), { timeout: 3_000 });
    expect(mockStream.isStreaming).toBe(true);

    await act(async () => {
      await result.current.stop();
    });
  });

  it(
    'stops the session rather than looping on a broken key',
    async () => {
      mockTranscribe.mockRejectedValue(new Error('401'));
      const { result } = await renderHook(() => useVoiceSession(handlers));

      await act(async () => {
        await result.current.start();
      });

      for (let attempt = 0; attempt < 3; attempt += 1) {
        await act(async () => {
          pushAudio(QUIET, 500);
          pushAudio(SPEAKING, 700);
          pushAudio(QUIET, 1_200);
        });
        await passes(400);
      }

      await waitFor(() => expect(result.current.active).toBe(false), { timeout: 6_000 });
      expect(mockTranscribe.mock.calls.length).toBeLessThanOrEqual(3);
      expect(result.current.error).toBeTruthy();
    },
    20_000
  );

  it('releases the microphone when the mode is switched away', async () => {
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      await result.current.start();
    });
    expect(mockStream.isStreaming).toBe(true);

    await act(async () => {
      useSettingsStore.setState({ voiceMode: 'tap-to-toggle' });
    });

    await waitFor(() => expect(mockStream.isStreaming).toBe(false));
    expect(result.current.active).toBe(false);
  });
});
