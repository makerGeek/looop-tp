import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { DIFFICULTY_PRESETS, findDifficulty } from '@/engine/difficulty';
import { useEngine } from '@/engine/EngineProvider';
import { selectIsGameOver, useGameStore } from '@/state/gameStore';
import { useOpenAIConfig } from '@/state/settingsStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Color, GameMode } from '@/chess/types';

/**
 * Home: pick a game, or pick up the one you left.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, radius } = useTheme();
  const engine = useEngine();
  const openAI = useOpenAIConfig();

  const newGame = useGameStore((state) => state.newGame);
  const snapshot = useGameStore((state) => state.snapshot);
  const savedMode = useGameStore((state) => state.mode);
  const gameOver = useGameStore(selectIsGameOver);

  const [mode, setMode] = useState<GameMode>('cpu');
  const [side, setSide] = useState<Color | 'random'>('w');
  const [difficultyId, setDifficultyId] = useState(useGameStore.getState().difficultyId);

  const hasGameInProgress = snapshot.history.length > 0 && !gameOver;
  const difficulty = useMemo(() => findDifficulty(difficultyId), [difficultyId]);

  const start = () => {
    const playerColor: Color = side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : side;
    newGame({ mode, playerColor, difficultyId });
    router.push('/game');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.xl,
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <Animated.View entering={FadeInDown.duration(360)}>
        <Text style={[typography.display, { color: colors.text }]}>Voice Chess</Text>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Say your move. The rules are never up for debate.
        </Text>
      </Animated.View>

      {hasGameInProgress ? (
        <Animated.View entering={FadeInDown.delay(60).duration(360)}>
          <Card title="Continue">
            <Text style={[typography.body, { color: colors.text }]}>
              {savedMode === 'cpu' ? 'Game against the CPU' : 'Pass and play'} ·{' '}
              {snapshot.history.length} {snapshot.history.length === 1 ? 'move' : 'moves'} played
            </Text>
            <Button
              label="Resume game"
              onPress={() => router.push('/game')}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(120).duration(360)}>
        <Card title="New game">
          <Segmented<GameMode>
            options={[
              { value: 'cpu', label: 'vs CPU' },
              { value: 'pass-and-play', label: 'Pass & play' },
            ]}
            value={mode}
            onChange={setMode}
          />

          {mode === 'cpu' ? (
            <>
              <Text style={[typography.label, { color: colors.textMuted, marginTop: spacing.lg }]}>
                YOU PLAY
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <Segmented<Color | 'random'>
                  options={[
                    { value: 'w', label: 'White' },
                    { value: 'b', label: 'Black' },
                    { value: 'random', label: 'Random' },
                  ]}
                  value={side}
                  onChange={setSide}
                />
              </View>

              <Text style={[typography.label, { color: colors.textMuted, marginTop: spacing.lg }]}>
                STRENGTH
              </Text>
              <View style={[styles.levels, { marginTop: spacing.sm, gap: spacing.sm }]}>
                {DIFFICULTY_PRESETS.map((preset) => {
                  const active = preset.id === difficultyId;
                  return (
                    <Button
                      key={preset.id}
                      label={preset.label}
                      variant={active ? 'primary' : 'secondary'}
                      onPress={() => setDifficultyId(preset.id)}
                      style={styles.level}
                    />
                  );
                })}
              </View>
              <Text style={[typography.caption, { color: colors.textFaint, marginTop: spacing.sm }]}>
                {difficulty.blurb}
                {difficulty.targetElo ? ` · around ${difficulty.targetElo} Elo` : ' · full strength'}
              </Text>
            </>
          ) : (
            <Text style={[typography.caption, { color: colors.textFaint, marginTop: spacing.lg }]}>
              Two players, one device. The board flips between turns so both sides always look right.
            </Text>
          )}

          <Button label="Start" size="lg" onPress={start} style={{ marginTop: spacing.lg }} testID="start-game" />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(360)} style={{ gap: spacing.md }}>
        <View
          style={[
            styles.statusRow,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
          ]}
        >
          <StatusDot ok={engine.status.state === 'ready' && engine.status.kind === 'stockfish'} />
          <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
            {engine.status.state === 'ready'
              ? engine.status.kind === 'stockfish'
                ? `${engine.status.name} ready`
                : 'Built-in engine (Stockfish unavailable)'
              : 'Starting the engine…'}
          </Text>
        </View>

        <View
          style={[
            styles.statusRow,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
          ]}
        >
          <StatusDot ok={Boolean(openAI)} />
          <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
            {openAI ? 'Voice ready' : 'Add an OpenAI key to talk your moves'}
          </Text>
        </View>

        <Button label="Settings" variant="ghost" onPress={() => router.push('/settings')} />
      </Animated.View>
    </ScrollView>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.sm,
        backgroundColor: ok ? colors.positive : colors.warning,
      }}
    />
  );
}

const styles = StyleSheet.create({
  levels: { flexDirection: 'row', flexWrap: 'wrap' },
  level: { flexGrow: 1, flexBasis: '30%' },
  statusRow: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
});
