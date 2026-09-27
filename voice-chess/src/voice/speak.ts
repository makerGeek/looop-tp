import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';

import { OpenAIError, postJsonForBytes, type OpenAIConfig } from './openaiClient';

/**
 * The app's voice.
 *
 * Two properties matter here, and the first version had neither:
 *
 * **Utterances never overlap.** Speaking used to stop whatever was playing and
 * then go off to synthesise over the network. Two calls close together — your
 * move confirmed, then the CPU's reply announced — both passed that stop
 * *before* either had started playing, so nothing was cancelled and both
 * played at once. Requests are now queued, and each waits for the previous one
 * to finish.
 *
 * **Interrupting really interrupts.** `stopSpeaking()` bumps a generation
 * counter, so anything queued or mid-synthesis is abandoned rather than
 * arriving late. That is what makes pressing the mic feel immediate.
 */

export type SpeechVoice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
export type SpeechRoute = 'openai' | 'device' | 'silent';

export interface SpeakOptions {
  /** Skip the network hop entirely (used when offline or muted). */
  offlineOnly?: boolean;
  voice?: SpeechVoice;
  model?: string;
  /** Style guidance sent to the speech model. */
  instructions?: string;
  rate?: number;
  signal?: AbortSignal;
}

export const DEFAULT_TTS_INSTRUCTIONS =
  'You are a friendly, focused chess partner sitting across the board. ' +
  'Speak briefly and warmly, with the easy rhythm of a person thinking aloud. ' +
  'Never spell out punctuation and never sound like an announcer.';

/** Nothing should hold the queue longer than this, whatever the platform does. */
const MAX_UTTERANCE_MS = 20_000;

/** Bumped by `stopSpeaking`; anything holding a stale value gives up. */
let generation = 0;
/** Serialises utterances so they play one after another. */
let queue: Promise<unknown> = Promise.resolve();
let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;
/**
 * Settles the utterance that is playing right now.
 *
 * Removing a player does not make it report a final status, so without this an
 * interrupted utterance would sit on its timeout — twenty seconds during which
 * `isSpeaking()` stays true and continuous listening refuses to reopen the
 * microphone. Interrupting has to be immediate to be worth anything.
 */
let settleCurrent: (() => void) | null = null;
/** Utterances accepted but not yet finished, including ones still synthesising. */
let outstanding = 0;

/**
 * Whether the app is talking, or is about to.
 *
 * Continuous listening needs this: playing audio sets `allowsRecording: false`,
 * so a microphone left open through an utterance is not merely impolite, it is
 * broken — and what it would hear is the app's own voice.
 */
export function isSpeaking(): boolean {
  return outstanding > 0;
}

/**
 * Resolves once nothing is speaking or queued.
 *
 * Deliberately re-checks: a line enqueued while we wait (the engine announcing
 * its reply a second after your move was confirmed) extends the wait rather
 * than sneaking through behind us.
 */
export async function whenQuiet(): Promise<void> {
  for (let guard = 0; outstanding > 0 && guard < 64; guard += 1) {
    await queue.catch(() => undefined);
  }
}

/** Stops what is playing and abandons anything queued behind it. */
export async function stopSpeaking(): Promise<void> {
  generation += 1;
  releasePlayer();
  try {
    await Speech.stop();
  } catch {
    // expo-speech throws when nothing is queued on some platforms.
  }
}

function releasePlayer(): void {
  const settle = settleCurrent;
  settleCurrent = null;
  try {
    currentPlayer?.remove();
  } catch {
    // Already released.
  }
  currentPlayer = null;
  // Re-entrant: `finish` releases the player itself, and is idempotent.
  settle?.();
}

/**
 * Speaks `text`, after anything already queued. Resolves when this utterance
 * has finished — callers that do not care can simply not await it.
 */
export function speak(
  text: string,
  config: OpenAIConfig | null,
  options: SpeakOptions = {}
): Promise<SpeechRoute> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve('silent');

  const mine = generation;
  // Counted before the queue is joined, so `isSpeaking()` is true the instant
  // `speak()` returns — a caller that reopens the microphone on the next line
  // must not win that race.
  outstanding += 1;
  const run = queue.then(() => utter(trimmed, mine, config, options));
  // The queue must survive a failed utterance, so swallow here and let the
  // caller see the rejection on `run` instead.
  queue = run.then(
    () => {
      outstanding -= 1;
    },
    () => {
      outstanding -= 1;
    }
  );
  return run;
}

async function utter(
  text: string,
  mine: number,
  config: OpenAIConfig | null,
  options: SpeakOptions
): Promise<SpeechRoute> {
  // Superseded while waiting our turn.
  if (mine !== generation) return 'silent';

  if (config && !options.offlineOnly) {
    try {
      const uri = await synthesizeToFile(text, config, options);
      if (mine !== generation) return 'silent';

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      await playToCompletion(uri, mine);
      return 'openai';
    } catch (error) {
      if (!(error instanceof OpenAIError)) throw error;
      // Fall through to the device voice.
    }
  }

  if (mine !== generation) return 'silent';
  return speakWithDevice(text, options);
}

function playToCompletion(uri: string, mine: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        subscription?.remove();
      } catch {
        // Already gone.
      }
      if (currentPlayer === player) releasePlayer();
      resolve();
    };

    const player = createAudioPlayer(uri);
    currentPlayer = player;
    settleCurrent = finish;

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish || mine !== generation) finish();
    });

    // A missed status event must not wedge the queue.
    const timer = setTimeout(finish, MAX_UTTERANCE_MS);

    try {
      player.play();
    } catch {
      finish();
    }
  });
}

function speakWithDevice(text: string, options: SpeakOptions): Promise<SpeechRoute> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (route: SpeechRoute) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(route);
    };
    const timer = setTimeout(() => done('device'), MAX_UTTERANCE_MS);

    try {
      Speech.speak(text, {
        rate: options.rate ?? 1.0,
        pitch: 1.0,
        onDone: () => done('device'),
        onStopped: () => done('silent'),
        onError: () => done('silent'),
      });
    } catch {
      done('silent');
    }
  });
}

/** Downloads synthesized speech to the cache directory and returns its URI. */
export async function synthesizeToFile(
  text: string,
  config: OpenAIConfig,
  options: SpeakOptions = {}
): Promise<string> {
  const bytes = await postJsonForBytes(
    config,
    '/audio/speech',
    {
      model: options.model ?? 'gpt-4o-mini-tts',
      voice: options.voice ?? 'coral',
      input: text,
      instructions: options.instructions ?? DEFAULT_TTS_INSTRUCTIONS,
      response_format: 'mp3',
    },
    { signal: options.signal }
  );

  const directory = new Directory(Paths.cache, 'voice-chess-tts');
  if (!directory.exists) directory.create({ intermediates: true });

  // A content-addressed name means repeated lines ("Check.") reuse one file.
  const file = new File(directory, `${hash(text)}.mp3`);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file.uri;
}

/** FNV-1a — small, fast, and good enough to name a cache file. */
function hash(text: string): string {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(36);
}
