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
 * Levels are **dBFS**, straight from `rmsDbfs`. The first version worked on a
 * 0–1 scale mapped from an assumed -60…0 dB range, which was wrong twice over:
 * the platforms report silence as -160, and a margin expressed as "0.1" is not
 * a quantity anyone can reason about. Speech stands above a room by a number of
 * decibels, so decibels are what the thresholds are written in.
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
  /** Decibels above the noise floor at which a level counts as speech. */
  openMargin: number;
  /** Decibels above the floor it must fall below again to count as quiet. */
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
   * Decibels of variation below which a long burst is judged to be the room
   * rather than a person.
   *
   * This replaced a scheme that let the noise floor creep upward during speech
   * to escape a roaring room. On a decibel scale that escalates — each rise
   * lifts the target, which lifts the floor — and it would cut a long sentence
   * off partway through. Dynamic range is the honest discriminator instead:
   * speech is never steady, because it has plosives, vowels and gaps between
   * words, while a fan or a road holds the same level indefinitely.
   */
  minDynamicRangeDb: number;
  /**
   * How long a burst must run before its dynamic range is worth judging.
   *
   * A short burst can legitimately be flat — one held vowel, a single knock.
   */
  dynamicRangeAfterMs: number;
  /**
   * Ceiling (in dBFS) on the floor's opening estimate.
   *
   * The first sample of a session is usually silence, because the microphone
   * only opens once the app has stopped talking. Usually — someone who starts
   * their sentence early would otherwise have their own voice adopted as the
   * background, and would never be heard at all. Capping the seed costs
   * nothing in a quiet room and rescues that case; `floorCreep` handles a room
   * that really is this loud.
   */
  maxInitialFloor: number;
  /**
   * Floor (in dBFS) below which the estimate will not be dragged.
   *
   * A muted or disconnected microphone reports digital silence forever. Without
   * a lower bound the noise floor would chase it to -160, and then the faintest
   * electrical noise would clear `openMargin` and read as speech.
   */
  minFloor: number;
}

export const DEFAULT_VAD_OPTIONS: VadOptions = {
  // Speech typically sits 15–25 dB over a domestic room. Opening at 9 dB
  // catches a quiet speaker without opening on a fridge.
  openMargin: 9,
  closeMargin: 5,
  minSpeechMs: 300,
  hangoverMs: 800,
  maxUtteranceMs: 12_000,
  idleTimeoutMs: 45_000,
  floorRise: 0.05,
  floorFall: 0.3,
  minDynamicRangeDb: 6,
  dynamicRangeAfterMs: 1_500,
  // -35 dBFS is already a loud room; above that we stop believing it is noise.
  maxInitialFloor: -35,
  minFloor: -75,
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
  /** Quietest level seen during the current burst, for the range test. */
  burstMin: number | null;
  /** Loudest level seen during the current burst. */
  burstMax: number | null;
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
  /** Input level in dBFS (≤ 0), as `rmsDbfs` reports it. */
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
    burstMin: null,
    burstMax: null,
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
        floor: clampFloor(Math.min(level, options.maxInitialFloor), options),
        quietSince: at,
      },
      event: { kind: 'quiet' },
    };
  }

  // The floor is learnt only while nobody is talking. Adapting it during
  // speech is how a detector stops hearing the person it is listening to.
  const floor = state.speaking ? state.floor : adaptFloor(state.floor, level, options);
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
          burstMin: level,
          burstMax: level,
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
  const burstMin = Math.min(state.burstMin ?? level, level);
  const burstMax = Math.max(state.burstMax ?? level, level);

  /**
   * Flat for long enough to be machinery rather than a voice. The floor is
   * lifted to what we actually heard, so the same noise does not reopen the
   * gate a tenth of a second later.
   */
  const isBackground =
    at - startedAt >= options.dynamicRangeAfterMs &&
    burstMax - burstMin < options.minDynamicRangeDb;
  const settled = (): VadState => closed(isBackground ? Math.max(floor, burstMin) : floor, at, options);

  // A burst that is still going but has already shown itself to be machinery
  // is closed immediately — there is no reason to hold the gate open for it.
  if (isBackground) {
    return { state: settled(), event: { kind: 'discard', reason: 'background', speechMs } };
  }

  if (at - startedAt >= options.maxUtteranceMs) {
    return { state: settled(), event: { kind: 'utterance', reason: 'max-duration', speechMs } };
  }

  if (!loud && at - lastLoudAt >= options.hangoverMs) {
    return speechMs < options.minSpeechMs
      ? { state: settled(), event: { kind: 'discard', reason: 'too-short', speechMs } }
      : { state: settled(), event: { kind: 'utterance', reason: 'silence', speechMs } };
  }

  return { state: { ...state, floor, lastLoudAt, burstMin, burstMax }, event: { kind: 'speech' } };
}

/**
 * Back to waiting, with the idle clock restarted. The floor is carried over:
 * the room has not changed just because the sentence ended.
 */
function closed(floor: number, at: number, options: VadOptions): VadState {
  return {
    floor: clampFloor(floor, options),
    speaking: false,
    speechStartedAt: null,
    lastLoudAt: null,
    quietSince: at,
    burstMin: null,
    burstMax: null,
  };
}

/**
 * Tracks the background level, asymmetrically. Falling fast towards a quieter
 * room makes the detector responsive after a noisy moment passes; rising slowly
 * keeps a drawn-out word from being absorbed into the floor and going unheard.
 */
function adaptFloor(floor: number, level: number, options: VadOptions): number {
  // A loud sample is probably speech, and speech must never raise the floor far
  // enough to hide itself.
  const target = Math.min(level, floor + options.openMargin);
  const rate = target < floor ? options.floorFall : options.floorRise;
  return clampFloor(floor + (target - floor) * rate, options);
}

/** Keeps the floor inside the range where a margin above it still means something. */
function clampFloor(value: number, options: VadOptions): number {
  if (Number.isNaN(value)) return options.minFloor;
  return Math.max(options.minFloor, Math.min(0, value));
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
    /** @param level dBFS, from `rmsDbfs`. */
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
