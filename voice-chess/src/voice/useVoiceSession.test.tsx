/**
 * Regression tests for the microphone lifecycle.
 *
 * Both cases here were reported from a real Android device, and neither was
 * reachable through the UI tests: they only appear when the permission dialog
 * delays `start()` past the finger-release that was meant to stop it.
 */

const mockRecorder = {
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(() => {
    mockRecorder.isRecording = true;
  }),
  stop: jest.fn(async () => {
    mockRecorder.isRecording = false;
  }),
  uri: null as string | null,
  isRecording: false,
};

/** Resolves only when the test lets it, standing in for the permission dialog. */
let mockReleasePermission: (() => void) | null = null;

jest.mock('expo-audio', () => ({
  useAudioRecorder: () => mockRecorder,
  useAudioRecorderState: () => ({ isRecording: mockRecorder.isRecording, metering: undefined }),
  RecordingPresets: { HIGH_QUALITY: {}, LOW_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(
    () => new Promise((resolve) => {
      mockReleasePermission = () => resolve({ granted: true });
    })
  ),
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
import { act, renderHook } from '@testing-library/react-native';
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
  mockReleasePermission = null;
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
