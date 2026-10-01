import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { confirmPlayerMove } from '@/chess/narration';
import { useGameStore, selectIsGameOver } from '@/state/gameStore';
import { useSettingsStore, useOpenAIConfig } from '@/state/settingsStore';
import { parseWithGrammar } from './grammar';
import { interpretUtterance, type VoiceOutcome } from './interpret';
import type { CommandName, ParsedUtterance, QuestionName } from './intents';
import { parseWithModel } from './nlu';
import { OpenAIError } from './openaiClient';
import { CAPTURE_SAMPLE_RATE, Capture } from './capture';
import { isSpeaking, whenQuiet } from './speak';
import { transcribeAudio } from './transcribe';
import { SILENCE_DBFS } from './pcm';
import { createVad } from './vad';
import type { Square } from '@/chess/types';

/**
 * The voice loop.
 *
 * record → transcribe → parse → resolve → act → speak
 *
 * Three things are worth calling out:
 *
 * 1. **The grammar runs first, always.** Most utterances at a chessboard are a
 *    closed vocabulary, and matching them locally is instant and free. The
 *    language model is only consulted when the grammar is unsure, which keeps
 *    the common case fast and the app usable without a key.
 * 2. **Neither parser decides anything.** Both emit constraints;
 *    `interpretUtterance` intersects them with the legal-move list. An illegal
 *    move cannot reach the board through this path.
 * 3. **Capture is raw PCM, not a recorder.** Every mode reads the same 16 kHz
 *    mono stream. `capture.ts` turns it into clips and reports an honest RMS
 *    level; `vad.ts` decides where one sentence ends and the next begins.
 *    In the manual modes the finger decides instead, but the clip is built the
 *    same way. Everything downstream is shared.
 *
 *    This replaced a `MediaRecorder` whose level came from
 *    `getMaxAmplitude()` — a destructive peak read that two pollers were
 *    consuming at once, so neither saw the real signal — and whose clips began
 *    when the microphone opened rather than when the speech did.
 */

export type VoiceState =
  | 'idle'
  | 'listening'
  /** Continuous mode, microphone deliberately shut while the app talks. */
  | 'paused'
  | 'transcribing'
  | 'understanding'
  | 'unavailable'
  | 'error';

export interface VoiceSessionHandlers {
  say(text: string): Promise<void> | void;
  repeat(): Promise<void> | void;
  silence(): Promise<void> | void;
  onCommand(command: CommandName): void;
  onQuestion(question: QuestionName, square?: Square): void;
  /** Called after a legal move is played, so the caller can nudge the CPU. */
  onMovePlayed?(): void;
  /**
   * True while the app is about to talk for reasons of its own — the engine is
   * searching, and will announce its move when it finishes. Continuous mode
   * keeps the microphone shut through that.
   */
  isBusy?(): boolean;
}

/** Grammar results below this fall through to the model, when one is available. */
const MODEL_FALLBACK_THRESHOLD = 0.8;

/** Consecutive transcription failures before continuous mode gives up. */
const MAX_CONSECUTIVE_FAILURES = 3;
/**
 * How often we check whether the microphone can be reopened.
 *
 * Only needed while the stream is stopped — once it is running, its own buffers
 * drive everything, so there is no polling at all.
 */
const RESUME_POLL_MS = 250;
/**
 * The first buffers after the stream starts are not representative: the input
 * gain is still settling. Seeding the noise floor from them would leave the
 * gate stuck open or stuck shut.
 */
const WARMUP_MS = 300;
/** Shown on the ring: how far above the floor counts as "full". */
const RING_RANGE_DB = 30;

export function useVoiceSession(handlers: VoiceSessionHandlers) {
  const [state, setState] = useState<VoiceState>('idle');
  const [level, setLevel] = useState(0);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Whether a continuous session is running, for the button's label. */
  const [active, setActive] = useState(false);

  const config = useOpenAIConfig();
  const useModelFallback = useSettingsStore((s) => s.useModelFallback);
  const transcriptionModel = useSettingsStore((s) => s.models.transcription);
  const chatModel = useSettingsStore((s) => s.models.chat);
  const voiceMode = useSettingsStore((s) => s.voiceMode);

  /**
   * Lifecycle, tracked in refs rather than state.
   *
   * `start` awaits a permission dialog, and on Android that dialog eats the
   * finger-release that would normally stop the recording. Reading `state`
   * inside these async callbacks is both stale and too late, so the phase is
   * kept somewhere that async code can read synchronously.
   */
  const phase = useRef<'idle' | 'starting' | 'listening'>('idle');
  const stopRequested = useRef(false);

  const continuous = useRef(false);
  const streaming = useRef(false);
  const startedAt = useRef(0);
  const processing = useRef(false);
  const failures = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const capture = useRef(new Capture());
  const vad = useRef(createVad());

  // `onBuffer` is created before the callbacks it needs, so it reaches them
  // through refs rather than forcing the stream to be rebuilt on every render.
  const finishRef = useRef<() => Promise<void>>(async () => undefined);
  const endRef = useRef<(note?: string) => Promise<void>>(async () => undefined);
  const stopStreamRef = useRef<() => void>(() => undefined);

  /** What the detector is hearing, for the diagnostics panel. */
  const diagnostics = useRef({ level: SILENCE_DBFS, floor: SILENCE_DBFS, clipMs: 0, latencyMs: 0 });

  // Callers rebuild these callbacks every render; holding them in a ref keeps
  // the stream callback stable without a dependency treadmill.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  /**
   * Every buffer from the microphone, about ten times a second.
   *
   * This is the only place the detector is driven from, which is the point:
   * the previous design had two independent pollers reading a destructive peak
   * counter, so each saw a different and incomplete signal.
   */
  const onBuffer = useCallback((buffer: { data: ArrayBuffer; sampleRate: number; channels: number }) => {
    const db = capture.current.accept(buffer);
    diagnostics.current.level = db;
    diagnostics.current.floor = vad.current.floor ?? SILENCE_DBFS;

    // Shown relative to the room, so the ring responds wherever the floor sits.
    const floor = vad.current.floor ?? SILENCE_DBFS;
    const unit = Math.max(0, Math.min(1, (db - floor) / RING_RANGE_DB));
    setLevel((previous) => (Math.abs(previous - unit) > 0.04 ? unit : previous));

    if (!continuous.current || processing.current) return;
    // Let the input gain settle before believing anything it reports.
    if (Date.now() - startedAt.current < WARMUP_MS) return;

    // The app is talking, or the engine is about to make it talk. Recording
    // through that would capture our own voice.
    if (isSpeaking() || handlersRef.current.isBusy?.()) {
      capture.current.abandon();
      vad.current.reset();
      stopStreamRef.current();
      setState('paused');
      return;
    }

    switch (vad.current.push(db, Date.now()).kind) {
      case 'speech-start':
        capture.current.begin();
        setState('listening');
        break;
      case 'utterance':
        void finishRef.current();
        break;
      case 'discard':
        // A cough, a chair, or the room itself. Costs no transcription.
        capture.current.abandon();
        break;
      case 'idle':
        void endRef.current("Stopped listening — tap the mic when you're ready.");
        break;
      default:
        break;
    }
  }, []);

  const { stream } = useAudioStream({
    sampleRate: CAPTURE_SAMPLE_RATE,
    channels: 1,
    encoding: 'int16',
    onBuffer,
  });

  const parse = useCallback(
    async (text: string, store: ReturnType<typeof useGameStore.getState>): Promise<ParsedUtterance> => {
      const grammar = parseWithGrammar(text);
      const goodEnough = grammar.intent.kind !== 'unknown' && grammar.confidence >= MODEL_FALLBACK_THRESHOLD;
      if (goodEnough || !useModelFallback || !config) return grammar;

      try {
        const model = await parseWithModel(config, text, store.snapshot, {
          model: chatModel,
          pendingCandidates: store.pendingClarification?.candidates.map((move) => move.san),
        });
        // Trust whichever parser is more certain; ties go to the grammar,
        // which is cheaper and never hallucinates.
        return model.confidence > grammar.confidence ? model : grammar;
      } catch {
        return grammar;
      }
    },
    [chatModel, config, useModelFallback]
  );

  const act = useCallback(async (outcome: VoiceOutcome) => {
    const store = useGameStore.getState();

    switch (outcome.kind) {
      case 'move': {
        const result = store.applyMove({
          from: outcome.move.from,
          to: outcome.move.to,
          promotion: outcome.move.promotion,
        });
        if (result.status === 'played') {
          const line = confirmPlayerMove(result.move);
          store.say(line);
          await handlersRef.current.say(line);
          handlersRef.current.onMovePlayed?.();
        } else if (result.status === 'needs-promotion') {
          const line = `Promoting on ${result.to} — queen, rook, bishop or knight?`;
          store.say(line);
          await handlersRef.current.say(line);
        }
        break;
      }

      case 'promotion': {
        store.applyResolution({
          status: 'needs-promotion',
          from: outcome.from,
          to: outcome.to,
          candidates: [],
        });
        store.say(outcome.speech);
        await handlersRef.current.say(outcome.speech);
        break;
      }

      case 'clarify':
        store.setClarification(outcome.clarification);
        store.say(outcome.speech, 'hint');
        await handlersRef.current.say(outcome.speech);
        break;

      case 'command':
        handlersRef.current.onCommand(outcome.command);
        break;

      case 'question':
        handlersRef.current.onQuestion(outcome.question, outcome.square);
        break;

      case 'reject':
        store.say(outcome.speech, 'error');
        await handlersRef.current.say(outcome.speech);
        break;

      case 'unheard':
        store.say(outcome.speech, 'error');
        await handlersRef.current.say(outcome.speech);
        break;
    }
  }, []);

  /** Exposed so the type-a-move field goes through exactly the same pipeline. */
  const handleTranscript = useCallback(
    async (text: string) => {
      const store = useGameStore.getState();
      const parsed = await parse(text, store);
      const outcome = interpretUtterance(parsed, {
        snapshot: store.snapshot,
        isPlayersTurn: isPlayersTurn(store),
        isGameOver: selectIsGameOver(store),
        pendingClarification: store.pendingClarification,
      });
      await act(outcome);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, chatModel, useModelFallback]
  );

  // -------------------------------------------------------------- the stream

  /**
   * Checks that voice can run at all. Returns an explanation, or null when the
   * microphone and the key are both in place.
   */
  const checkReady = useCallback(async (): Promise<string | null> => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      return 'Microphone access is off. Enable it in system settings to talk your moves.';
    }
    if (!config) {
      return 'Add an OpenAI key in Settings to use voice. You can still tap or type moves.';
    }
    return null;
  }, [config]);

  const startStream = useCallback(async (): Promise<boolean> => {
    if (streaming.current) return true;
    try {
      // Playing audio turns recording off, so this is re-asserted every time
      // rather than once per session.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await stream.start();
      streaming.current = true;
      startedAt.current = Date.now();
      capture.current.abandon();
      return true;
    } catch (cause) {
      streaming.current = false;
      setState('error');
      setError(describeRecorderError(cause));
      return false;
    }
  }, [stream]);

  const stopStream = useCallback(() => {
    if (!streaming.current) return;
    streaming.current = false;
    try {
      stream.stop();
    } catch {
      // Stopping a stream that already stopped is not worth surfacing.
    }
    capture.current.abandon();
    setLevel(0);
  }, [stream]);

  /** transcribe -> parse -> resolve -> act, for one clip. */
  const processClip = useCallback(
    async (uri: string): Promise<boolean> => {
      if (!config) return false;
      setState('transcribing');
      try {
        const { text, durationMs } = await transcribeAudio(config, uri, {
          model: transcriptionModel,
        });
        diagnostics.current.latencyMs = durationMs;
        setLastTranscript(text);
        if (!text.trim()) {
          setState('idle');
          return true;
        }

        useGameStore.getState().heard(text);
        setState('understanding');
        await handleTranscript(text);
        setState('idle');
        return true;
      } catch (cause) {
        setState('error');
        const message =
          cause instanceof OpenAIError ? cause.spokenMessage : 'Something went wrong listening.';
        setError(message);
        await handlersRef.current.say(message);
        return false;
      }
    },
    // `handleTranscript` is recreated with the same deps as this callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, transcriptionModel, chatModel, useModelFallback]
  );

  // ---------------------------------------------------------- continuous mode

  const endContinuous = useCallback(
    async (note?: string) => {
      continuous.current = false;
      stopRequested.current = true;
      if (resumeTimer.current) {
        clearInterval(resumeTimer.current);
        resumeTimer.current = null;
      }
      vad.current.reset();
      stopStream();
      phase.current = 'idle';
      setActive(false);
      setState((current) => (current === 'error' ? current : 'idle'));
      if (note) useGameStore.getState().say(note, 'system');
    },
    [stopStream]
  );

  /** Ends the clip, sends it, and decides whether the session carries on. */
  const finishUtterance = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;
    try {
      const clip = await capture.current.finish();
      if (!clip) return;
      diagnostics.current.clipMs = clip.durationMs;

      // The microphone is released for the round trip and whatever the app says
      // in reply. Holding it open would record our own voice back.
      stopStream();

      const ok = await processClip(clip.uri);
      failures.current = ok ? 0 : failures.current + 1;
      if (failures.current >= MAX_CONSECUTIVE_FAILURES) {
        await endContinuous('Stopped listening. Tap the mic to try again.');
      }
    } finally {
      processing.current = false;
    }
  }, [endContinuous, processClip, stopStream]);

  // Kept fresh so the stream callback always runs the current closure without
  // the stream itself being torn down and rebuilt.
  useEffect(() => {
    finishRef.current = finishUtterance;
    endRef.current = endContinuous;
    stopStreamRef.current = stopStream;
  }, [endContinuous, finishUtterance, stopStream]);

  const beginContinuous = useCallback(async () => {
    if (continuous.current) return;
    setError(null);
    await handlersRef.current.silence();

    const problem = await checkReady();
    if (problem) {
      setState('unavailable');
      setError(problem);
      return;
    }

    continuous.current = true;
    stopRequested.current = false;
    failures.current = 0;
    vad.current.reset();
    setActive(true);

    if (!(await startStream())) {
      await endContinuous();
      return;
    }
    setState('listening');

    // Only runs while the stream is stopped — once it is going, its own buffers
    // drive the loop and nothing polls.
    const interval = setInterval(() => {
      if (!continuous.current || streaming.current || processing.current) return;
      if (isSpeaking() || handlersRef.current.isBusy?.()) return;
      void (async () => {
        await whenQuiet();
        if (!continuous.current || streaming.current || processing.current) return;
        if (isSpeaking() || handlersRef.current.isBusy?.()) return;
        vad.current.reset();
        if (await startStream()) setState('listening');
      })();
    }, RESUME_POLL_MS);

    // The session may have ended while the microphone was opening — the mode
    // switched in Settings, or the screen left. `endContinuous` has already run
    // and found no timer to clear, so this one would tick for the app's life.
    if (!continuous.current) {
      clearInterval(interval);
      return;
    }
    resumeTimer.current = interval;
  }, [checkReady, endContinuous, startStream]);

  // ------------------------------------------------------------- manual modes

  const start = useCallback(async () => {
    if (voiceMode === 'continuous') {
      await beginContinuous();
      return;
    }
    // Ignore a second press while the first is still opening the microphone.
    if (phase.current !== 'idle') return;
    phase.current = 'starting';
    stopRequested.current = false;

    setError(null);
    await handlersRef.current.silence();

    const problem = await checkReady();
    if (problem) {
      phase.current = 'idle';
      setState('unavailable');
      setError(problem);
      return;
    }

    // The press is already over — typically the permission dialog swallowed the
    // release. Opening the microphone now would leave it running with nothing
    // to close it.
    if (stopRequested.current) {
      phase.current = 'idle';
      setState('idle');
      return;
    }

    if (!(await startStream())) {
      phase.current = 'idle';
      return;
    }
    // The finger decides the boundaries here, so collection starts at once.
    capture.current.begin();
    phase.current = 'listening';
    setState('listening');
  }, [beginContinuous, checkReady, startStream, voiceMode]);

  const stop = useCallback(async () => {
    if (continuous.current) {
      await endContinuous();
      return;
    }
    // Released before the microphone finished opening: tell `start` to unwind.
    if (phase.current === 'starting') {
      stopRequested.current = true;
      return;
    }
    if (phase.current !== 'listening') return;
    phase.current = 'idle';

    const clip = await capture.current.finish();
    stopStream();
    if (!clip) {
      setState('idle');
      return;
    }
    diagnostics.current.clipMs = clip.durationMs;
    await processClip(clip.uri);
  }, [endContinuous, processClip, stopStream]);

  const cancel = useCallback(async () => {
    if (continuous.current) {
      await endContinuous();
      return;
    }
    stopRequested.current = true;
    phase.current = 'idle';
    stopStream();
    setState('idle');
  }, [endContinuous, stopStream]);

  // Switching away from continuous mode in Settings, or leaving the screen,
  // must not leave a timer holding the microphone open.
  useEffect(() => {
    if (voiceMode !== 'continuous' && continuous.current) void endContinuous();
  }, [endContinuous, voiceMode]);

  useEffect(
    () => () => {
      continuous.current = false;
      if (resumeTimer.current) clearInterval(resumeTimer.current);
      resumeTimer.current = null;
    },
    []
  );

  return {
    state,
    /** 0–1 input level relative to the room, for the mic animation. */
    level,
    isRecording: state === 'listening',
    /** Whether a continuous session is running. */
    active,
    lastTranscript,
    error,
    start,
    stop,
    cancel,
    /**
     * Live numbers for the diagnostics panel, as the ref itself.
     *
     * These change ten times a second; rendering from them would re-render the
     * whole screen at the buffer rate. The panel samples them on its own clock.
     */
    diagnostics,
    /** Runs raw text through the full pipeline (used by the type-a-move field). */
    submitText: handleTranscript,
  };
}

/**
 * Recorder failures arrive as bare native errors. Keeping the name and message
 * visible is what makes a bug report from a real device actionable.
 */
function describeRecorderError(cause: unknown): string {
  const error = cause as { name?: string; message?: string } | undefined;
  const detail = [error?.name, error?.message].filter(Boolean).join(': ');
  return detail
    ? `Couldn't start the microphone — ${detail}`
    : "Couldn't start the microphone. Try again, or tap your move.";
}

function isPlayersTurn(store: ReturnType<typeof useGameStore.getState>): boolean {
  if (store.mode === 'pass-and-play') return true;
  return store.snapshot.turn === store.playerColor;
}
