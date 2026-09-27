/**
 * Voice activity detection.
 *
 * Continuous listening needs to answer one question, over and over: has the
 * person finished talking? There is no speech API on the device that will say
 * so, and sending a fixed-length clip every few seconds is both wasteful and
 * terrible to use — it cuts people off mid-sentence and charges for silence.
 *
 * What we do have is the recorder's input level. This module turns a stream of
 * those levels into utterance boundaries, and it is deliberately pure: given a
 * state and a sample it returns a new state and an event, with no timers, no
 * recorder and no React. That is what makes end-of-speech behaviour something
 * we can actually test, instead of something we guess at on a device.
 *
 * Three details carry most of the weight:
 *
 * 1. **The threshold follows the room, not a constant.** A café is louder than
 *    a bedroom, and a phone's own gain drifts. The noise floor is tracked while
 *    nobody is talking — quickly downwards, slowly upwards — so the gate sits
 *    just above whatever "quiet" happens to mean right now.
 * 2. **Opening and closing use different thresholds.** A single threshold
 *    chatters: the level crosses it dozens of times inside one word. Speech has
 *    to clear `openMargin` to start and fall below the lower `closeMargin` to
 *    count as quiet.
 * 3. **A pause is not the end.** People pause to think, especially at a
 *    chessboard ("knight to… f3"). `hangoverMs` of quiet is what ends an
 *    utterance, and `minSpeechMs` throws away the door slams and coughs that
 *    would otherwise be transcribed into nonsense.
 */

export interface VadOptions {
  /** How far above the noise floor the level must rise to count as speech. */
  openMargin: number;
  /** How far above the floor it must fall back below to count as quiet. */
  closeMargin: number;
  /** Speech shorter than this is a cough, a knock or a chair — not a move. */
  minSpeechMs: number;
  /** Quiet for this long ends the utterance. */
  hangoverMs: number;
  /** Hard ceiling, so a noisy room can't hold the microphone open forever. */
  maxUtteranceMs: number;
  /** Silence for this long with nothing said ends the session. */
  idleTimeoutMs: number;
  /** How fast the floor rises towards a louder room (0–1, per sample). */
  floorRise: number;
  /** How fast it falls towards a quieter one. Higher: we trust quiet sooner. */
  floorFall: number;
  /**
   * How fast the floor may still creep upwards *during* speech.
   *
   * Slow, because raising the floor while someone is talking is how you stop
   * hearing them — but not negligible: a genuinely loud room would otherwise
   * latch the gate open at the first sample and hold it until the ceiling,
   * every time, forever. At this rate a steady roar is reclassified as the
   * floor in a couple of seconds, while a real sentence (which clears the gate
   * by far more than `openMargin`) is untouched even at the ceiling.
   */
  floorCreep: number;
  /**
   * Ceiling on the floor's opening estimate.
   *
   * The first sample of a session is usually silence, because the microphone
   * only opens once the app has stopped talking. Usually — someone who starts
   * their sentence early would otherwise have their own voice adopted as the
   * background, and would never be heard at all. Capping the seed costs
   * nothing in a quiet room and rescues that case; `floorCreep` handles a room
   * that really is this loud.
   */
  maxInitialFloor: number;
}

export const DEFAULT_VAD_OPTIONS: VadOptions = {
  openMargin: 0.1,
  closeMargin: 0.05,
  minSpeechMs: 300,
  hangoverMs: 900,
  maxUtteranceMs: 12_000,
  idleTimeoutMs: 30_000,
  floorRise: 0.05,
  floorFall: 0.3,
  floorCreep: 0.05,
  maxInitialFloor: 0.35,
};

export interface VadState {
  /** Running estimate of the background level. `null` until the first sample. */
  floor: number | null;
  speaking: boolean;
  /** When the current burst of speech began. */
  speechStartedAt: number | null;
  /** The most recent sample that was loud enough to count as speech. */
  lastLoudAt: number | null;
  /** Start of the current stretch of nothing-said, for the idle clock. */
  quietSince: number | null;
  /**
   * The floor when the current burst began.
   *
   * Compared against the floor at the end, this is what separates a person who
   * stopped talking from a room that turned out to be loud: only the latter
   * drags the floor up behind it. See `discard`.
   */
  floorAtSpeechStart: number | null;
}

export type VadEvent =
  /** Nothing to act on; keep recording. */
  | { kind: 'quiet' }
  /** Still recording, but the person is talking now. */
  | { kind: 'speech' }
  /** First sample of a new burst — a good moment to show the mic as live. */
  | { kind: 'speech-start' }
  /** The utterance is over. Stop the recorder and transcribe the clip. */
  | { kind: 'utterance'; reason: 'silence' | 'max-duration'; speechMs: number }
  /**
   * A burst that was not a sentence. Throw the clip away and carry on — the
   * point of saying so separately is that this costs no transcription call.
   *
   * `too-short` is a cough, a door or a chair. `background` is the room itself:
   * the gate opened on noise and only closed because the noise floor caught up
   * with it, which means there is no speech in the clip at all.
   */
  | { kind: 'discard'; reason: 'too-short' | 'background'; speechMs: number }
  /** Nobody has said anything for a long time. Close the session. */
  | { kind: 'idle' };

export interface VadSample {
  /** Input level, 0–1. */
  level: number;
  /** Timestamp in milliseconds. */
  at: number;
}

export function initialVadState(): VadState {
  return {
    floor: null,
    speaking: false,
    speechStartedAt: null,
    lastLoudAt: null,
    quietSince: null,
    floorAtSpeechStart: null,
  };
}

/**
 * Folds one sample into the detector.
 *
 * Pure: the same state and sample always give the same result.
 */
export function advanceVad(
  state: VadState,
  sample: VadSample,
  options: VadOptions = DEFAULT_VAD_OPTIONS
): { state: VadState; event: VadEvent } {
  const { level, at } = sample;

  // First sample of a session: the room is whatever we can hear right now —
  // within reason. See `maxInitialFloor`.
  if (state.floor === null || state.quietSince === null) {
    return {
      state: {
        ...initialVadState(),
        floor: Math.min(clamp01(level), options.maxInitialFloor),
        quietSince: at,
      },
      event: { kind: 'quiet' },
    };
  }

  const floor = adaptFloor(state.floor, level, state.speaking, options);
  // Hysteresis: a higher bar to start talking than to keep talking.
  const threshold = floor + (state.speaking ? options.closeMargin : options.openMargin);
  const loud = level > threshold;

  if (!state.speaking) {
    if (loud) {
      return {
        state: {
          ...state,
          floor,
          speaking: true,
          speechStartedAt: at,
          lastLoudAt: at,
          floorAtSpeechStart: floor,
        },
        event: { kind: 'speech-start' },
      };
    }
    if (at - state.quietSince >= options.idleTimeoutMs) {
      return { state: { ...state, floor }, event: { kind: 'idle' } };
    }
    return { state: { ...state, floor }, event: { kind: 'quiet' } };
  }

  // Mid-utterance.
  const startedAt = state.speechStartedAt ?? at;
  const lastLoudAt = loud ? at : (state.lastLoudAt ?? startedAt);
  const speechMs = lastLoudAt - startedAt;

  if (at - startedAt >= options.maxUtteranceMs) {
    // Not checked for background noise: a roaring room is closed out by the
    // creeping floor within a second or two, long before the ceiling, so
    // anything that lasts this long is somebody talking.
    return { state: closed(floor, at), event: { kind: 'utterance', reason: 'max-duration', speechMs } };
  }

  if (!loud && at - lastLoudAt >= options.hangoverMs) {
    // "Quiet" here means below the *current* threshold, and the threshold has
    // been creeping up. If the level would still have opened the gate at the
    // threshold this burst started with, then nothing actually went quiet —
    // the floor simply caught up with the room. There is no speech in the clip.
    const background = level > (state.floorAtSpeechStart ?? floor) + options.openMargin;
    if (background) {
      return { state: closed(floor, at), event: { kind: 'discard', reason: 'background', speechMs } };
    }
    return speechMs < options.minSpeechMs
      ? { state: closed(floor, at), event: { kind: 'discard', reason: 'too-short', speechMs } }
      : { state: closed(floor, at), event: { kind: 'utterance', reason: 'silence', speechMs } };
  }

  return { state: { ...state, floor, lastLoudAt }, event: { kind: 'speech' } };
}

/**
 * Back to waiting, with the idle clock restarted. The floor is carried over:
 * the room has not changed just because the sentence ended.
 */
function closed(floor: number, at: number): VadState {
  return {
    floor,
    speaking: false,
    speechStartedAt: null,
    lastLoudAt: null,
    quietSince: at,
    floorAtSpeechStart: null,
  };
}

/**
 * Tracks the background level, asymmetrically. Falling fast towards a quieter
 * room makes the detector responsive after a noisy moment passes; rising slowly
 * keeps a drawn-out word from being absorbed into the floor and going unheard.
 */
function adaptFloor(floor: number, level: number, speaking: boolean, options: VadOptions): number {
  // A loud sample is probably speech, and speech must never raise the floor far
  // enough to hide itself.
  const target = Math.min(level, floor + options.openMargin);
  // Mid-sentence the floor may only creep, and only upwards: a pause inside a
  // sentence is not evidence that the room got quieter.
  if (speaking) return target > floor ? clamp01(floor + (target - floor) * options.floorCreep) : floor;
  const rate = target < floor ? options.floorFall : options.floorRise;
  return clamp01(floor + (target - floor) * rate);
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Stateful convenience wrapper for the hook, which has nowhere tidy to thread
 * an immutable state through a timer callback.
 */
export function createVad(overrides: Partial<VadOptions> = {}) {
  const options = { ...DEFAULT_VAD_OPTIONS, ...overrides };
  let state = initialVadState();

  return {
    options,
    push(level: number, at: number = Date.now()): VadEvent {
      const next = advanceVad(state, { level, at }, options);
      state = next.state;
      return next.event;
    },
    /** Forgets the utterance in progress but keeps nothing — a fresh session. */
    reset(): void {
      state = initialVadState();
    },
    get speaking(): boolean {
      return state.speaking;
    },
    get floor(): number | null {
      return state.floor;
    },
  };
}

export type Vad = ReturnType<typeof createVad>;
