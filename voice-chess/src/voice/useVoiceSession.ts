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
import { transcribeAudio } from './transcribe';
import type { Square } from '@/chess/types';

/**
 * The voice loop.
 *
 * record → transcribe → parse → resolve → act → speak
 *
 * Two things are worth calling out:
 *
 * 1. **The grammar runs first, always.** Most utterances at a chessboard are a
 *    closed vocabulary, and matching them locally is instant and free. The
 *    language model is only consulted when the grammar is unsure, which keeps
 *    the common case fast and the app usable without a key.
 * 2. **Neither parser decides anything.** Both emit constraints;
 *    `interpretUtterance` intersects them with the legal-move list. An illegal
 *    move cannot reach the board through this path.
 */

export type VoiceState =
  | 'idle'
  | 'listening'
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
}

/** Grammar results below this fall through to the model, when one is available. */
const MODEL_FALLBACK_THRESHOLD = 0.8;

export function useVoiceSession(handlers: VoiceSessionHandlers) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 120);

  const [state, setState] = useState<VoiceState>('idle');
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = useOpenAIConfig();
  const useModelFallback = useSettingsStore((s) => s.useModelFallback);
  const transcriptionModel = useSettingsStore((s) => s.models.transcription);
  const chatModel = useSettingsStore((s) => s.models.chat);

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

  const start = useCallback(async () => {
    setError(null);
    await handlersRef.current.silence();

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setState('unavailable');
      setError('Microphone access is off. Enable it in system settings to talk your moves.');
      return;
    }

    if (!config) {
      setState('unavailable');
      setError('Add an OpenAI key in Settings to use voice. You can still tap or type moves.');
      return;
    }

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('listening');
    } catch (cause) {
      setState('error');
      setError((cause as Error).message);
    }
  }, [config, recorder]);

  const stop = useCallback(async () => {
    if (state !== 'listening') return;

    try {
      await recorder.stop();
    } catch {
      // Stopping a recorder that already stopped is not an error worth showing.
    }

    const uri = recorder.uri;
    if (!uri || !config) {
      setState('idle');
      return;
    }

    setState('transcribing');
    try {
      const { text } = await transcribeAudio(config, uri, { model: transcriptionModel });
      setLastTranscript(text);
      if (!text.trim()) {
        setState('idle');
        return;
      }

      useGameStore.getState().heard(text);
      setState('understanding');
      await handleTranscript(text);
      setState('idle');
    } catch (cause) {
      setState('error');
      const message =
        cause instanceof OpenAIError ? cause.spokenMessage : 'Something went wrong listening.';
      setError(message);
      await handlersRef.current.say(message);
    }
    // `handleTranscript` is recreated with the same deps as this callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, recorder, state, transcriptionModel, chatModel, useModelFallback]);

  const cancel = useCallback(async () => {
    if (state === 'listening') {
      try {
        await recorder.stop();
      } catch {
        // ignore
      }
    }
    setState('idle');
  }, [recorder, state]);

  return {
    state,
    /** 0–1 input level, for the mic animation. */
    level: normalizeMetering(recorderState.metering),
    isRecording: recorderState.isRecording,
    lastTranscript,
    error,
    start,
    stop,
    cancel,
    /** Runs raw text through the full pipeline (used by the type-a-move field). */
    submitText: handleTranscript,
  };
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
