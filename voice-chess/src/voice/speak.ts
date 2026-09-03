import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';

import { OpenAIError, postJsonForBytes, type OpenAIConfig } from './openaiClient';

/**
 * Text-to-speech with a graceful ladder of fallbacks.
 *
 * 1. OpenAI speech — warm, natural, and worth the round trip.
 * 2. The on-device voice (`expo-speech`) — instant and works offline.
 * 3. Silence, with the line still shown on screen.
 *
 * A failure at any rung silently drops to the next one: losing the network
 * should never cost the player their game.
 */

export type SpeechVoice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';

export interface SpeakOptions {
  /** Skip the network hop entirely (used when the player is offline or muted). */
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

let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;

/** Stops whatever the app is currently saying. Safe to call at any time. */
export async function stopSpeaking(): Promise<void> {
  try {
    currentPlayer?.remove();
  } catch {
    // The player may already be released; nothing to do.
  }
  currentPlayer = null;
  try {
    await Speech.stop();
  } catch {
    // expo-speech throws when nothing is queued on some platforms.
  }
}

/**
 * Speaks `text`. Resolves once playback has *started* (not finished), so the
 * caller can keep the UI responsive.
 */
export async function speak(
  text: string,
  config: OpenAIConfig | null,
  options: SpeakOptions = {}
): Promise<'openai' | 'device' | 'silent'> {
  const trimmed = text.trim();
  if (!trimmed) return 'silent';

  await stopSpeaking();

  if (config && !options.offlineOnly) {
    try {
      const uri = await synthesizeToFile(trimmed, config, options);
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      const player = createAudioPlayer(uri);
      currentPlayer = player;
      player.play();
      return 'openai';
    } catch (error) {
      if (!(error instanceof OpenAIError)) throw error;
      // fall through to the device voice
    }
  }

  try {
    Speech.speak(trimmed, { rate: options.rate ?? 1.0, pitch: 1.0 });
    return 'device';
  } catch {
    return 'silent';
  }
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
