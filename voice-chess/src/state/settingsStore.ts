import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_DIFFICULTY_ID } from '@/engine/difficulty';
import { DEFAULT_BASE_URL, type OpenAIConfig } from '@/voice/openaiClient';
import type { SpeechVoice } from '@/voice/speak';

/**
 * User preferences.
 *
 * Everything except the API key is persisted with AsyncStorage. The key lives
 * in the device keychain via `expo-secure-store` and is deliberately kept out
 * of the persisted blob — see `loadApiKey`/`setApiKey` below.
 */

export type AppearancePreference = 'system' | 'light' | 'dark';
export type VoiceMode = 'push-to-talk' | 'tap-to-toggle';

export interface ModelSettings {
  transcription: string;
  chat: string;
  tts: string;
}

interface SettingsState {
  appearance: AppearancePreference;

  // Voice
  voiceEnabled: boolean;
  spokenFeedback: boolean;
  voiceMode: VoiceMode;
  ttsVoice: SpeechVoice;
  speechRate: number;
  /** Consult the language model when the offline grammar can't parse. */
  useModelFallback: boolean;
  models: ModelSettings;

  // Board & feedback
  showLegalMoves: boolean;
  showCoordinates: boolean;
  hapticsEnabled: boolean;
  autoFlipInPassAndPlay: boolean;

  // Play
  difficultyId: string;

  // Secrets (not persisted here)
  apiKey: string | null;
  apiKeyLoaded: boolean;

  setAppearance(value: AppearancePreference): void;
  toggle(key: BooleanSettingKey): void;
  setVoiceMode(value: VoiceMode): void;
  setTtsVoice(value: SpeechVoice): void;
  setSpeechRate(value: number): void;
  setDifficulty(id: string): void;
  setModel(key: keyof ModelSettings, value: string): void;

  loadApiKey(): Promise<void>;
  setApiKey(value: string | null): Promise<void>;
}

type BooleanSettingKey =
  | 'voiceEnabled'
  | 'spokenFeedback'
  | 'useModelFallback'
  | 'showLegalMoves'
  | 'showCoordinates'
  | 'hapticsEnabled'
  | 'autoFlipInPassAndPlay';

const API_KEY_SLOT = 'voice-chess.openai-key';

export const DEFAULT_MODELS: ModelSettings = {
  transcription: 'gpt-4o-mini-transcribe',
  chat: 'gpt-4o-mini',
  tts: 'gpt-4o-mini-tts',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      appearance: 'system',

      voiceEnabled: true,
      spokenFeedback: true,
      voiceMode: 'push-to-talk',
      ttsVoice: 'coral',
      speechRate: 1,
      useModelFallback: true,
      models: DEFAULT_MODELS,

      showLegalMoves: true,
      showCoordinates: true,
      hapticsEnabled: true,
      autoFlipInPassAndPlay: true,

      difficultyId: DEFAULT_DIFFICULTY_ID,

      apiKey: null,
      apiKeyLoaded: false,

      setAppearance: (appearance) => set({ appearance }),
      toggle: (key) => set((state) => ({ [key]: !state[key] }) as Partial<SettingsState>),
      setVoiceMode: (voiceMode) => set({ voiceMode }),
      setTtsVoice: (ttsVoice) => set({ ttsVoice }),
      setSpeechRate: (speechRate) => set({ speechRate }),
      setDifficulty: (difficultyId) => set({ difficultyId }),
      setModel: (key, value) => set({ models: { ...get().models, [key]: value } }),

      loadApiKey: async () => {
        if (get().apiKeyLoaded) return;
        let stored: string | null = null;
        try {
          stored = await SecureStore.getItemAsync(API_KEY_SLOT);
        } catch {
          // Keychain unavailable (simulator quirk, or a device without one).
        }
        set({ apiKey: stored ?? null, apiKeyLoaded: true });
      },

      setApiKey: async (value) => {
        const trimmed = value?.trim() ?? '';
        try {
          if (trimmed) await SecureStore.setItemAsync(API_KEY_SLOT, trimmed);
          else await SecureStore.deleteItemAsync(API_KEY_SLOT);
        } catch {
          // Fall through — the in-memory value still works for this session.
        }
        set({ apiKey: trimmed || null, apiKeyLoaded: true });
      },
    }),
    {
      name: 'voice-chess.settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // The key is a secret and belongs in the keychain, not in a JSON blob.
      partialize: ({ apiKey: _apiKey, apiKeyLoaded: _loaded, ...rest }) => rest,
    }
  )
);

/**
 * Resolves the OpenAI credentials, preferring a key the user typed into
 * Settings over the build-time environment variable.
 */
export function resolveOpenAIConfig(apiKey: string | null): OpenAIConfig | null {
  const key = apiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
  if (!key.trim()) return null;
  return {
    apiKey: key.trim(),
    baseUrl: process.env.EXPO_PUBLIC_OPENAI_BASE_URL ?? DEFAULT_BASE_URL,
  };
}

/**
 * Memoised so the returned object stays referentially stable — a fresh object
 * from a Zustand selector on every render is a re-render loop waiting to
 * happen.
 */
export function useOpenAIConfig(): OpenAIConfig | null {
  const apiKey = useSettingsStore((state) => state.apiKey);
  return useMemo(() => resolveOpenAIConfig(apiKey), [apiKey]);
}
