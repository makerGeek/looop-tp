import { useCallback, useRef, useState } from 'react';

import { useOpenAIConfig, useSettingsStore } from '@/state/settingsStore';
import { speak, stopSpeaking } from './speak';

/**
 * The app's voice.
 *
 * Wraps `speak()` with the user's preferences and keeps a record of the last
 * line so "say that again" works. Speaking is fire-and-forget by design: the
 * board must never wait on audio.
 */
export function useSpeaker() {
  const spokenFeedback = useSettingsStore((state) => state.spokenFeedback);
  const ttsVoice = useSettingsStore((state) => state.ttsVoice);
  const speechRate = useSettingsStore((state) => state.speechRate);
  const ttsModel = useSettingsStore((state) => state.models.tts);
  const config = useOpenAIConfig();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastLine = useRef<string | null>(null);

  const say = useCallback(
    async (text: string) => {
      lastLine.current = text;
      if (!spokenFeedback || !text.trim()) return;

      setIsSpeaking(true);
      try {
        await speak(text, config, { voice: ttsVoice, model: ttsModel, rate: speechRate });
      } catch {
        // A failed line is never worth interrupting the game for.
      } finally {
        setIsSpeaking(false);
      }
    },
    [config, speechRate, spokenFeedback, ttsModel, ttsVoice]
  );

  const repeat = useCallback(async () => {
    if (lastLine.current) await say(lastLine.current);
  }, [say]);

  const silence = useCallback(async () => {
    await stopSpeaking();
    setIsSpeaking(false);
  }, []);

  return { say, repeat, silence, isSpeaking, lastLine };
}
