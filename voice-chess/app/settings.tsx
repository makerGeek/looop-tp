import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { SettingRow, ToggleRow } from '@/components/ui/SettingRow';
import { useEngine } from '@/engine/EngineProvider';
import { DEFAULT_MODELS, useSettingsStore } from '@/state/settingsStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { SpeechVoice } from '@/voice/speak';

const VOICES: SpeechVoice[] = ['coral', 'alloy', 'sage', 'verse', 'ballad'];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, radius } = useTheme();
  const engine = useEngine();

  const settings = useSettingsStore();
  const [keyDraft, setKeyDraft] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settings.loadApiKey();
    // Runs once; `loadApiKey` short-circuits when the key is already loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveKey = async () => {
    await settings.setApiKey(keyDraft);
    setKeyDraft('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <View style={styles.header}>
        <Text style={[typography.title, { color: colors.text }]}>Settings</Text>
        <Button label="Done" variant="ghost" onPress={() => router.back()} />
      </View>

      <Card title="Appearance">
        <Segmented
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={settings.appearance}
          onChange={settings.setAppearance}
        />
      </Card>

      <Card title="Voice">
        <ToggleRow
          label="Voice input"
          hint="Talk your moves instead of tapping"
          value={settings.voiceEnabled}
          onChange={() => settings.toggle('voiceEnabled')}
        />
        <ToggleRow
          label="Spoken replies"
          hint="The app talks back"
          value={settings.spokenFeedback}
          onChange={() => settings.toggle('spokenFeedback')}
        />
        <SettingRow label="Microphone" hint="How the mic button behaves">
          <View style={{ width: 190 }}>
            <Segmented
              options={[
                { value: 'push-to-talk', label: 'Hold' },
                { value: 'tap-to-toggle', label: 'Tap' },
              ]}
              value={settings.voiceMode}
              onChange={settings.setVoiceMode}
            />
          </View>
        </SettingRow>
        <SettingRow label="Voice" hint="Used for spoken replies">
          <View style={{ width: 190 }}>
            <Segmented
              options={VOICES.slice(0, 3).map((voice) => ({ value: voice, label: capitalise(voice) }))}
              value={VOICES.slice(0, 3).includes(settings.ttsVoice) ? settings.ttsVoice : 'coral'}
              onChange={settings.setTtsVoice}
            />
          </View>
        </SettingRow>
        <ToggleRow
          label="Smart parsing"
          hint="Ask the language model when the built-in parser is unsure. Legality is always decided by the chess engine, never the model."
          value={settings.useModelFallback}
          onChange={() => settings.toggle('useModelFallback')}
        />
      </Card>

      <Card title="Board">
        <ToggleRow
          label="Show legal moves"
          value={settings.showLegalMoves}
          onChange={() => settings.toggle('showLegalMoves')}
        />
        <ToggleRow
          label="Show coordinates"
          value={settings.showCoordinates}
          onChange={() => settings.toggle('showCoordinates')}
        />
        <ToggleRow
          label="Haptics"
          value={settings.hapticsEnabled}
          onChange={() => settings.toggle('hapticsEnabled')}
        />
        <ToggleRow
          label="Auto-flip in pass & play"
          hint="Turn the board between moves"
          value={settings.autoFlipInPassAndPlay}
          onChange={() => settings.toggle('autoFlipInPassAndPlay')}
        />
      </Card>

      <Card title="OpenAI">
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {settings.apiKey
            ? 'A key is saved in this device’s keychain.'
            : 'Voice needs a key. It is stored in the device keychain, never in the app bundle.'}
        </Text>
        <TextInput
          value={keyDraft}
          onChangeText={setKeyDraft}
          placeholder={settings.apiKey ? 'Replace saved key…' : 'sk-…'}
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          accessibilityLabel="OpenAI API key"
          style={[
            typography.mono,
            {
              color: colors.text,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        />
        <View style={[styles.keyActions, { gap: spacing.sm, marginTop: spacing.md }]}>
          <Button label={saved ? 'Saved' : 'Save key'} onPress={saveKey} disabled={!keyDraft.trim()} style={{ flex: 1 }} />
          {settings.apiKey ? (
            <Button label="Remove" variant="danger" onPress={() => settings.setApiKey(null)} style={{ flex: 1 }} />
          ) : null}
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <ModelField
            label="Transcription"
            value={settings.models.transcription}
            placeholder={DEFAULT_MODELS.transcription}
            onChange={(value) => settings.setModel('transcription', value)}
          />
          <ModelField
            label="Understanding"
            value={settings.models.chat}
            placeholder={DEFAULT_MODELS.chat}
            onChange={(value) => settings.setModel('chat', value)}
          />
          <ModelField
            label="Speech"
            value={settings.models.tts}
            placeholder={DEFAULT_MODELS.tts}
            onChange={(value) => settings.setModel('tts', value)}
          />
        </View>
      </Card>

      <Card title="Engine">
        <Text style={[typography.body, { color: colors.text }]}>
          {engine.status.state === 'ready'
            ? engine.status.kind === 'stockfish'
              ? `${engine.status.name} — running as WebAssembly`
              : 'Built-in engine — Stockfish could not be loaded'
            : 'Starting…'}
        </Text>
        <Text style={[typography.caption, { color: colors.textFaint, marginTop: spacing.xs }]}>
          Stockfish is fetched once and cached by the system WebView. Without it the app falls back to a
          smaller built-in engine so play never stops.
        </Text>
        <Button label="Restart engine" variant="secondary" onPress={engine.retry} style={{ marginTop: spacing.md }} />
      </Card>
    </ScrollView>
  );
}

function ModelField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange(value: string): void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View>
      <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={`${label} model`}
        style={[
          typography.mono,
          {
            color: colors.text,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
      />
    </View>
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  keyActions: { flexDirection: 'row' },
});
