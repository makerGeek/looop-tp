import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { confirmPlayerMove } from '@/chess/narration';
import { useGameStore, selectIsGameOver } from '@/state/gameStore';
import { useSettingsStore, useOpenAIConfig } from '@/state/settingsStore';
import { parseWithGrammar } from './grammar';
import { interpretUtterance, type VoiceOutcome } from './interpret';
import type { CommandName, ParsedUtterance, QuestionName } from './intents';
import { parseWithModel } from './nlu';
import { OpenAIError } from './openaiClient';
import { isSpeaking, whenQuiet } from './speak';
import { transcribeAudio } from './transcribe';
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
 * 3. **Continuous mode owns the microphone, not the finger.** In the two manual
 *    modes a press opens the recorder and a release closes it. In continuous
 *    mode a timer samples the input level, `vad.ts` decides where one sentence
 *    ends and the next begins, and the loop closes and reopens the recorder
 *    around each one. Everything downstream of the clip is shared.
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

/**
 * Metering is off by default in every preset, and without it `metering` is
 * simply `undefined` — no level ring, and no continuous listening at all.
 */
const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

/** How often continuous mode reads the input level. */
const SAMPLE_MS = 100;
/**
 * The first moments after `record()` are not representative: the encoder is
 * spinning up and the level can read as either silence or a spike. Seeding the
 * noise floor from that would leave the gate stuck open or stuck shut.
 */
const WARMUP_MS = 300;
/** Consecutive transcription failures before continuous mode gives up. */
const MAX_CONSECUTIVE_FAILURES = 3;
/**
 * Breathing room before the microphone is reopened.
 *
 * The engine claims `isBusy` a beat after a move is played, not instantly, and
 * reopening into that gap only to shut again on the next tick means two
 * pointless round trips through the native recorder.
 */
const REOPEN_DELAY_MS = 250;

export function useVoiceSession(handlers: VoiceSessionHandlers) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 120);

  const [state, setState] = useState<VoiceState>('idle');
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
   * Recorder lifecycle, tracked in refs rather than state.
   *
   * `start` awaits a permission dialog, and on Android that dialog eats the
   * finger-release that would normally stop the recording. Reading `state`
   * inside these async callbacks is both stale and too late, so the phase is
   * kept somewhere that async code can read synchronously.
   */
  const phase = useRef<'idle' | 'starting' | 'listening'>('idle');
  const stopRequested = useRef(false);

  // Continuous-mode machinery. Refs throughout: the sampler is a timer, and a
  // timer that re-subscribed on every render would sample nothing reliably.
  const continuous = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampling = useRef(false);
  const openedAt = useRef(0);
  const closedAt = useRef(0);
  const failures = useRef(0);
  const vad = useRef(createVad());

  // Callers rebuild these callbacks every render; holding them in a ref keeps
  // the recorder callbacks stable without a dependency treadmill.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

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

  // ------------------------------------------------------------- the recorder

  /** Opens the microphone. Returns false if it could not be opened. */
  const openMicrophone = useCallback(async (): Promise<boolean> => {
    try {
      // Playing audio turns recording off, so this has to be re-asserted every
      // time rather than once per session.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      // Belt and braces: an interrupted session may still hold the microphone.
      if (recorder.isRecording) {
        try {
          await recorder.stop();
        } catch {
          // Nothing to salvage; preparing below will surface any real problem.
        }
      }
      await recorder.prepareToRecordAsync();
      if (stopRequested.current) return false;
      recorder.record();
      openedAt.current = Date.now();
      phase.current = 'listening';
      setState('listening');
      return true;
    } catch (cause) {
      phase.current = 'idle';
      setState('error');
      setError(describeRecorderError(cause));
      return false;
    }
  }, [recorder]);

  /** Closes the microphone and hands back the clip, if there is one. */
  const closeMicrophone = useCallback(async (): Promise<string | null> => {
    phase.current = 'idle';
    closedAt.current = Date.now();
    try {
      await recorder.stop();
    } catch {
      // Stopping a recorder that already stopped is not an error worth showing.
    }
    return recorder.uri ?? null;
  }, [recorder]);

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

  /** transcribe → parse → resolve → act, for one clip. */
  const processClip = useCallback(
    async (uri: string): Promise<boolean> => {
      if (!config) return false;
      setState('transcribing');
      try {
        const { text } = await transcribeAudio(config, uri, { model: transcriptionModel });
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
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      vad.current.reset();
      if (phase.current === 'listening') await closeMicrophone();
      phase.current = 'idle';
      setActive(false);
      setState((current) => (current === 'error' ? current : 'idle'));
      if (note) useGameStore.getState().say(note, 'system');
    },
    [closeMicrophone]
  );

  /**
   * One sampler tick.
   *
   * Re-entrant calls are dropped rather than queued: a tick that is waiting on
   * transcription has already closed the microphone, and a second tick reading
   * a dead recorder would only confuse the detector.
   */
  const sample = useCallback(async () => {
    if (!continuous.current || sampling.current) return;
    sampling.current = true;
    try {
      // The app is talking, or the engine is about to make it talk. Recording
      // through that would capture our own voice — and playback switches the
      // audio session out of recording mode anyway.
      if (isSpeaking() || handlersRef.current.isBusy?.()) {
        if (phase.current === 'listening') {
          await closeMicrophone();
          // The clip is discarded: whatever is in it, the useful part is over.
          vad.current.reset();
        }
        setState('paused');
        return;
      }

      if (phase.current === 'idle') {
        if (Date.now() - closedAt.current < REOPEN_DELAY_MS) return;
        await whenQuiet();
        if (!continuous.current || isSpeaking() || handlersRef.current.isBusy?.()) return;
        stopRequested.current = false;
        if (!(await openMicrophone())) await endContinuous();
        return;
      }

      if (phase.current !== 'listening') return;
      // Let the encoder settle before believing anything it reports.
      if (Date.now() - openedAt.current < WARMUP_MS) return;

      const event = vad.current.push(normalizeMetering(recorder.getStatus().metering), Date.now());

      switch (event.kind) {
        case 'utterance': {
          const uri = await closeMicrophone();
          if (!uri) return;
          const ok = await processClip(uri);
          failures.current = ok ? 0 : failures.current + 1;
          if (failures.current >= MAX_CONSECUTIVE_FAILURES) {
            await endContinuous('Stopped listening. Tap the mic to try again.');
          }
          break;
        }

        case 'discard':
          // A cough, a chair, or the room itself. Cycle the recorder so the
          // next clip starts clean — and never spend a transcription on it.
          await closeMicrophone();
          break;

        case 'idle':
          await endContinuous("Stopped listening — tap the mic when you're ready.");
          break;

        default:
          break;
      }
    } finally {
      sampling.current = false;
    }
  }, [closeMicrophone, endContinuous, openMicrophone, processClip, recorder]);

  // Kept in a ref so the interval always runs the freshest closure without
  // being torn down and rebuilt — restarting the timer mid-utterance would
  // reset the detector and lose the sentence.
  const sampleRef = useRef(sample);
  useEffect(() => {
    sampleRef.current = sample;
  }, [sample]);

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

    if (!(await openMicrophone())) {
      await endContinuous();
      return;
    }

    const interval = setInterval(() => {
      void sampleRef.current();
    }, SAMPLE_MS);
    // The session may have been ended while the microphone was opening — the
    // mode switched in Settings, or the screen left. `endContinuous` has
    // already run and found no timer to clear, so this one would tick for the
    // life of the app.
    if (!continuous.current) {
      clearInterval(interval);
      return;
    }
    timer.current = interval;
  }, [checkReady, endContinuous, openMicrophone]);

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
    // release. Opening a recording now would leave one running with nothing to
    // close it, and the next attempt would fail on an already-busy recorder.
    if (stopRequested.current) {
      phase.current = 'idle';
      setState('idle');
      return;
    }

    await openMicrophone();
  }, [beginContinuous, checkReady, openMicrophone, voiceMode]);

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

    const uri = await closeMicrophone();
    if (!uri) {
      setState('idle');
      return;
    }
    await processClip(uri);
  }, [closeMicrophone, endContinuous, processClip]);

  const cancel = useCallback(async () => {
    if (continuous.current) {
      await endContinuous();
      return;
    }
    stopRequested.current = true;
    if (phase.current === 'listening') await closeMicrophone();
    phase.current = 'idle';
    setState('idle');
  }, [closeMicrophone, endContinuous]);

  // Switching away from continuous mode in Settings, or leaving the screen,
  // must not leave a timer holding the microphone open.
  useEffect(() => {
    if (voiceMode !== 'continuous' && continuous.current) void endContinuous();
  }, [endContinuous, voiceMode]);

  useEffect(
    () => () => {
      continuous.current = false;
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    },
    []
  );

  return {
    state,
    /** 0–1 input level, for the mic animation. */
    level: normalizeMetering(recorderState.metering),
    isRecording: recorderState.isRecording,
    /** Whether a continuous session is running. */
    active,
    lastTranscript,
    error,
    start,
    stop,
    cancel,
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

/** Metering is reported in dBFS (about -60 … 0). Map it to a friendly 0–1. */
function normalizeMetering(metering: number | undefined): number {
  if (metering === undefined || Number.isNaN(metering)) return 0;
  const clamped = Math.max(-60, Math.min(0, metering));
  return (clamped + 60) / 60;
}
