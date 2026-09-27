/**
 * Regression tests for the microphone lifecycle.
 *
 * The push-to-talk cases here were reported from a real Android device, and
 * none was reachable through the UI tests: they only appear when the permission
 * dialog delays `start()` past the finger-release that was meant to stop it.
 *
 * The continuous-mode cases run the real sampler against a fake recorder whose
 * metering the test drives, which is the only way to exercise the loop's
 * close-transcribe-reopen cycle without a microphone.
 */

interface MockRecorder {
  prepareToRecordAsync: jest.Mock<Promise<undefined>, []>;
  record: jest.Mock<void, []>;
  stop: jest.Mock<Promise<void>, []>;
  getStatus: jest.Mock<{ isRecording: boolean; metering: number }, []>;
  metering: number;
  uri: string | null;
  isRecording: boolean;
}

const mockRecorder: MockRecorder = {
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(() => {
    mockRecorder.isRecording = true;
  }),
  stop: jest.fn(async () => {
    mockRecorder.isRecording = false;
  }),
  /** dBFS, as the native recorder reports it. -60 is silence. */
  getStatus: jest.fn((): { isRecording: boolean; metering: number } => ({
    isRecording: mockRecorder.isRecording,
    metering: mockRecorder.metering,
  })),
  metering: -60,
  uri: null as string | null,
  isRecording: false,
};

/** Resolves only when the test lets it, standing in for the permission dialog. */
let mockReleasePermission: (() => void) | null = null;
/** Set by the continuous tests, which need permission to be granted at once. */
let mockGrantImmediately = false;

const mockTranscribe = jest.fn(async () => ({ text: 'pawn to e4' }));
jest.mock('./transcribe', () => ({
  transcribeAudio: (...args: unknown[]) => mockTranscribe(...(args as [])),
}));

const mockUseAudioRecorder = jest.fn(() => mockRecorder);

jest.mock('expo-audio', () => ({
  useAudioRecorder: (...args: unknown[]) => mockUseAudioRecorder(...(args as [])),
  useAudioRecorderState: () => ({
    isRecording: mockRecorder.isRecording,
    metering: mockRecorder.metering,
  }),
  RecordingPresets: { HIGH_QUALITY: {}, LOW_QUALITY: {} },
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
  File: class {},
  Directory: class {},
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

const handlers = {
  say: jest.fn(async () => undefined),
  repeat: jest.fn(async () => undefined),
  silence: jest.fn(async () => undefined),
  onCommand: jest.fn(),
  onQuestion: jest.fn(),
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockRecorder.isRecording = false;
  mockRecorder.uri = null;
  mockRecorder.metering = -60;
  mockReleasePermission = null;
  mockGrantImmediately = false;
  mockTranscribe.mockResolvedValue({ text: 'pawn to e4' });
  useSettingsStore.setState({ voiceMode: 'push-to-talk' });
  // A key must be present, or `start` bails before ever touching the mockRecorder.
  await useSettingsStore.getState().setApiKey('sk-test-key');
});

afterAll(async () => {
  await useSettingsStore.getState().setApiKey(null);
});

describe('microphone lifecycle', () => {
  it('does not leave a recording open when the press ends during startup', async () => {
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

    expect(mockRecorder.record).not.toHaveBeenCalled();
    expect(mockRecorder.isRecording).toBe(false);
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

    expect(mockRecorder.record).toHaveBeenCalledTimes(1);
    expect(mockRecorder.isRecording).toBe(true);
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

    expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);
    expect(mockRecorder.record).toHaveBeenCalledTimes(1);
  });

  it('releases a microphone left open by an interrupted session', async () => {
    // Simulate the state the old bug left behind.
    mockRecorder.isRecording = true;

    const { result } = await renderHook(() => useVoiceSession(handlers));
    await act(async () => {
      result.current.start();
    });
    await act(async () => {
      mockReleasePermission?.();
      await Promise.resolve();
    });

    expect(mockRecorder.stop).toHaveBeenCalled();
    expect(mockRecorder.record).toHaveBeenCalledTimes(1);
  });
});

describe('recorder configuration', () => {
  it('asks for metering, which no preset enables', async () => {
    // Without this the recorder reports `metering: undefined`, which means no
    // input-level ring and — since the detector has nothing to detect —
    // no continuous listening at all. It is worth an assertion of its own
    // because everything downstream fails silently rather than loudly.
    await renderHook(() => useVoiceSession(handlers));

    expect(mockUseAudioRecorder).toHaveBeenCalledWith(
      expect.objectContaining({ isMeteringEnabled: true })
    );
  });
});

describe('continuous listening', () => {
  /** Waits out real time — the sampler and the detector both run off the clock. */
  const passes = (ms: number) => act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

  const speak = (dbfs: number) => {
    mockRecorder.metering = dbfs;
  };

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
    expect(mockRecorder.record).toHaveBeenCalledTimes(1);

    // Two seconds of silence: still listening, and no clip has been sent.
    await passes(2_000);
    expect(mockRecorder.isRecording).toBe(true);
    expect(mockTranscribe).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.stop();
    });
    expect(result.current.active).toBe(false);
  });

  it('transcribes a sentence when it ends, then reopens for the next one', async () => {
    mockRecorder.uri = 'file:///clip.m4a';
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      await result.current.start();
    });
    // Warmup, so the noise floor is seeded from the quiet room.
    await passes(500);

    speak(-6);
    await passes(600);
    // Still mid-sentence: nothing sent yet.
    expect(mockTranscribe).not.toHaveBeenCalled();

    speak(-60);
    await waitFor(() => expect(mockTranscribe).toHaveBeenCalledTimes(1), { timeout: 3_000 });

    // The move reached the board through the normal pipeline.
    await waitFor(() => expect(useGameStore.getState().snapshot.history).toHaveLength(1));
    expect(useGameStore.getState().snapshot.history[0].san).toBe('e4');

    // And the microphone came back for the next sentence, unprompted.
    await waitFor(() => expect(mockRecorder.record.mock.calls.length).toBeGreaterThan(1), {
      timeout: 3_000,
    });
    expect(result.current.active).toBe(true);

    await act(async () => {
      await result.current.stop();
    });
  });

  it('does not spend a transcription on a cough', async () => {
    mockRecorder.uri = 'file:///clip.m4a';
    const { result } = await renderHook(() => useVoiceSession(handlers));

    await act(async () => {
      await result.current.start();
    });
    await passes(500);

    // One brief spike, well under the minimum speech length.
    speak(-6);
    await passes(100);
    speak(-60);
    await passes(1_500);

    expect(mockTranscribe).not.toHaveBeenCalled();
    // The recorder was cycled rather than left holding a useless clip.
    expect(mockRecorder.stop).toHaveBeenCalled();

    await act(async () => {
      await result.current.stop();
    });
  });

  it('shuts the microphone while the engine is about to talk', async () => {
    // The engine announces its move the moment it finishes searching, and
    // recording through that would capture the app's own voice.
    let thinking = false;
    const { result } = await renderHook(() =>
      useVoiceSession({ ...handlers, isBusy: () => thinking })
    );

    await act(async () => {
      await result.current.start();
    });
    await passes(300);
    expect(mockRecorder.isRecording).toBe(true);

    thinking = true;
    await waitFor(() => expect(result.current.state).toBe('paused'), { timeout: 2_000 });
    expect(mockRecorder.isRecording).toBe(false);

    // …and takes it back afterwards, without the player touching anything.
    thinking = false;
    await waitFor(() => expect(result.current.state).toBe('listening'), { timeout: 2_000 });
    expect(mockRecorder.isRecording).toBe(true);

    await act(async () => {
      await result.current.stop();
    });
  });

  it(
    'stops the session rather than looping on a broken key',
    async () => {
      mockRecorder.uri = 'file:///clip.m4a';
      mockTranscribe.mockRejectedValue(new Error('401'));
      const { result } = await renderHook(() => useVoiceSession(handlers));

      await act(async () => {
        await result.current.start();
      });
      await passes(500);

      // Three sentences, three failures. Each cycle has to outlast the
      // hangover, so this test is deliberately slow.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        speak(-6);
        await passes(500);
        speak(-60);
        await passes(1_600);
      }

      await waitFor(() => expect(result.current.active).toBe(false), { timeout: 5_000 });
      // It gave up rather than burning the battery on a key that will not work.
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
    expect(mockRecorder.isRecording).toBe(true);

    await act(async () => {
      useSettingsStore.setState({ voiceMode: 'tap-to-toggle' });
    });

    await waitFor(() => expect(mockRecorder.isRecording).toBe(false));
    expect(result.current.active).toBe(false);
  });
});
