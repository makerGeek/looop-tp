import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLOR_NAMES, PIECE_NAMES } from '@/chess/board';
import {
  describeMove,
  describeMovesFrom,
  describePosition,
  describeResult,
  listPhrase,
} from '@/chess/narration';
import type { PieceSymbol, Square } from '@/chess/types';
import { ConversationLog } from '@/components/ConversationLog';
import { GameHeader } from '@/components/GameHeader';
import { MicButton } from '@/components/MicButton';
import { MoveList } from '@/components/MoveList';
import { PromotionSheet } from '@/components/PromotionSheet';
import { Board } from '@/components/board/Board';
import { Button } from '@/components/ui/Button';
import { findDifficulty } from '@/engine/difficulty';
import { useCpuTurn } from '@/engine/useCpuTurn';
import { selectIsGameOver, selectResult, useGameStore } from '@/state/gameStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useTheme } from '@/theme/ThemeProvider';
import * as dialogue from '@/voice/dialogue';
import type { CommandName, QuestionName } from '@/voice/intents';
import { useSpeaker } from '@/voice/useSpeaker';
import { useVoiceSession } from '@/voice/useVoiceSession';

/**
 * The game screen.
 *
 * This is the only place where the three input paths meet — touch, voice and
 * engine — and all three end up calling the same store actions, which in turn
 * call the same `ChessGame`. There is no shortcut around the rules from here.
 */
export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors, spacing, typography, radius } = useTheme();

  const store = useGameStore();
  const {
    snapshot,
    orientation,
    selected,
    targets,
    mode,
    playerColor,
    difficultyId,
    pendingPromotion,
    conversation,
  } = store;

  const result = useGameStore(selectResult);
  const gameOver = useGameStore(selectIsGameOver);

  const showLegalMoves = useSettingsStore((s) => s.showLegalMoves);
  const showCoordinates = useSettingsStore((s) => s.showCoordinates);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const autoFlip = useSettingsStore((s) => s.autoFlipInPassAndPlay);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const voiceMode = useSettingsStore((s) => s.voiceMode);
  const toggleSetting = useSettingsStore((s) => s.toggle);

  const speaker = useSpeaker();
  const [typed, setTyped] = useState('');

  const opponentLabel = mode === 'cpu' ? findDifficulty(difficultyId).label : 'the other seat';
  const lastMove = snapshot.history[snapshot.history.length - 1] ?? null;

  // The board is sized from the space actually left over after the header,
  // controls and panels, rather than from a fixed fraction of the screen. On a
  // small phone that means a slightly smaller board; on a tablet, a large one.
  // Either way nothing is ever pushed off the bottom.
  const [boardArea, setBoardArea] = useState(0);
  const boardSize = useMemo(() => {
    const widthLimit = width - spacing.lg * 2;
    const heightLimit = boardArea > 0 ? boardArea : height * 0.42;
    return Math.max(160, Math.floor(Math.min(widthLimit, heightLimit)));
  }, [boardArea, height, spacing.lg, width]);

  const buzz = useCallback(
    (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
      if (hapticsEnabled) Haptics.impactAsync(style).catch(() => undefined);
    },
    [hapticsEnabled]
  );

  const { isThinking, requestHint, engineStatus } = useCpuTurn({ say: speaker.say });

  // ---------------------------------------------------------------- commands

  const handleCommand = useCallback(
    async (command: CommandName) => {
      const state = useGameStore.getState();

      switch (command) {
        case 'undo': {
          const undone = state.undo();
          const line = undone.length ? dialogue.acknowledgeUndo(undone.length) : dialogue.nothingToUndo();
          state.say(line);
          await speaker.say(line);
          buzz();
          break;
        }
        case 'redo': {
          const redone = state.redo();
          const line = redone ? `Back to ${redone.san}.` : 'Nothing to put back.';
          state.say(line);
          await speaker.say(line);
          break;
        }
        case 'new-game': {
          state.newGame({ mode, playerColor, difficultyId });
          const line = dialogue.greeting(opponentLabel, playerColor === 'w');
          useGameStore.getState().say(line);
          await speaker.say(line);
          break;
        }
        case 'resign': {
          state.resign(mode === 'cpu' ? playerColor : state.snapshot.turn);
          const line = describeResult(useGameStore.getState().manualResult!);
          useGameStore.getState().say(line);
          await speaker.say(line);
          break;
        }
        case 'offer-draw': {
          // The CPU's answer is a simple, honest heuristic rather than a bluff:
          // it takes the draw when it is materially worse off.
          const edge = playerColor === 'w' ? state.snapshot.materialBalance : -state.snapshot.materialBalance;
          if (mode === 'pass-and-play' || edge >= 3) {
            state.agreeDraw();
            const line = 'Draw agreed. Good game.';
            useGameStore.getState().say(line);
            await speaker.say(line);
          } else {
            const line = "I'll play on, thanks.";
            state.say(line);
            await speaker.say(line);
          }
          break;
        }
        case 'repeat':
          await speaker.repeat();
          break;
        case 'flip-board':
          state.flipBoard();
          state.say('Board flipped.');
          break;
        case 'hint': {
          const san = await requestHint();
          const line = san ? `I'd look at ${san}.` : "Nothing jumps out — take your time.";
          useGameStore.getState().say(line, 'hint');
          await speaker.say(line);
          break;
        }
        case 'stop-listening':
          await speaker.silence();
          toggleSetting('spokenFeedback');
          state.say('Going quiet. Say “repeat” any time.', 'system');
          break;
        case 'read-moves': {
          const sans = state.snapshot.history.map((move) => move.san);
          const line = sans.length ? `So far: ${listPhrase(sans)}.` : 'No moves yet.';
          state.say(line);
          await speaker.say(line);
          break;
        }
      }
    },
    [buzz, difficultyId, mode, opponentLabel, playerColor, requestHint, speaker, toggleSetting]
  );

  // --------------------------------------------------------------- questions

  const handleQuestion = useCallback(
    async (question: QuestionName, square?: Square) => {
      const state = useGameStore.getState();
      const seat = mode === 'cpu' ? playerColor : state.snapshot.turn;
      let line: string;

      switch (question) {
        case 'position':
          line = describePosition(state.snapshot, seat);
          break;
        case 'whose-turn':
          line = `${COLOR_NAMES[state.snapshot.turn]} to move.`;
          break;
        case 'last-move': {
          const last = state.snapshot.history[state.snapshot.history.length - 1];
          line = last ? `The last move was ${describeMove(last)}` : 'No moves yet.';
          break;
        }
        case 'material': {
          const edge = seat === 'w' ? state.snapshot.materialBalance : -state.snapshot.materialBalance;
          line =
            edge === 0
              ? 'Material is level.'
              : edge > 0
                ? `You're up ${edge} ${edge === 1 ? 'point' : 'points'}.`
                : `You're down ${-edge} ${edge === -1 ? 'point' : 'points'}.`;
          break;
        }
        case 'moves-from': {
          if (!square) {
            line = 'Which square?';
            break;
          }
          const sans = state.snapshot.legalMoves.filter((m) => m.from === square).map((m) => m.san);
          line = describeMovesFrom(square, sans);
          break;
        }
        case 'captured': {
          const taken = state.snapshot.captured[seat].map((piece) => PIECE_NAMES[piece]);
          line = taken.length ? `You've taken ${listPhrase(taken)}.` : "You haven't taken anything yet.";
          break;
        }
      }

      state.say(line);
      await speaker.say(line);
    },
    [mode, playerColor, speaker]
  );

  const voice = useVoiceSession({
    say: speaker.say,
    repeat: speaker.repeat,
    silence: speaker.silence,
    onCommand: handleCommand,
    onQuestion: handleQuestion,
    onMovePlayed: () => buzz(Haptics.ImpactFeedbackStyle.Medium),
  });

  // ------------------------------------------------------------------ board

  const handleSquarePress = useCallback(
    (square: Square) => {
      const state = useGameStore.getState();
      if (selectIsGameOver(state)) return;

      const { selected: current, targets: currentTargets } = state;
      if (current && currentTargets.some((move) => move.to === square)) {
        const outcome = state.applyMove({ from: current, to: square });
        if (outcome.status === 'played') {
          buzz(Haptics.ImpactFeedbackStyle.Medium);
          const line = describeMove(outcome.move);
          state.say(line);
          speaker.say(line);
        }
        return;
      }
      state.select(square);
      buzz();
    },
    [buzz, speaker]
  );

  const handleDrop = useCallback(
    (from: Square, to: Square) => {
      const state = useGameStore.getState();
      const outcome = state.applyMove({ from, to });
      if (outcome.status === 'played') {
        buzz(Haptics.ImpactFeedbackStyle.Medium);
        const line = describeMove(outcome.move);
        state.say(line);
        speaker.say(line);
      } else if (outcome.status === 'rejected') {
        state.select(null);
      }
    },
    [buzz, speaker]
  );

  const choosePromotion = useCallback(
    (piece: PieceSymbol) => {
      const state = useGameStore.getState();
      const pending = state.pendingPromotion;
      if (!pending) return;
      const outcome = state.applyMove({ from: pending.from, to: pending.to, promotion: piece });
      if (outcome.status === 'played') {
        buzz(Haptics.ImpactFeedbackStyle.Medium);
        const line = describeMove(outcome.move);
        state.say(line);
        speaker.say(line);
      }
    },
    [buzz, speaker]
  );

  // Pass-and-play: turn the board so the player to move always sees their own
  // side at the bottom.
  useEffect(() => {
    if (mode === 'pass-and-play' && autoFlip && snapshot.turn !== orientation) {
      store.setOrientation(snapshot.turn);
    }
    // `store` is stable; re-running on orientation would fight the user's flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFlip, mode, snapshot.turn]);

  // Announce the ending exactly once. A ref rather than state: nothing renders
  // from it, and it must not itself cause a render.
  const announcedResult = useRef<string | null>(null);
  useEffect(() => {
    if (!result) {
      announcedResult.current = null;
      return;
    }
    const line = describeResult(result);
    if (announcedResult.current === line) return;
    announcedResult.current = line;

    useGameStore.getState().say(line, 'system');
    speaker.say(line);
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  }, [hapticsEnabled, result, speaker]);

  const interactive =
    !gameOver && (mode === 'pass-and-play' || snapshot.turn === playerColor) && !isThinking;

  const submitTyped = useCallback(async () => {
    const text = typed.trim();
    if (!text) return;
    setTyped('');
    useGameStore.getState().heard(text);
    await voice.submitText(text);
  }, [typed, voice]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.sm,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        <GameHeader
          snapshot={snapshot}
          result={result}
          orientation={orientation}
          opponentLabel={mode === 'cpu' ? opponentLabel : ''}
          engineStatus={engineStatus}
          isThinking={isThinking}
          onBack={() => router.back()}
        />

        <View
          style={styles.boardWrap}
          onLayout={(event) => setBoardArea(event.nativeEvent.layout.height)}
        >
          <Board
            size={boardSize}
            snapshot={snapshot}
            orientation={orientation}
            selected={selected}
            targets={targets}
            lastMove={lastMove}
            showCoordinates={showCoordinates}
            showLegalMoves={showLegalMoves}
            interactive={interactive}
            onSquarePress={handleSquarePress}
            onDrop={handleDrop}
          />
        </View>

        <MoveList history={snapshot.history} />

        <View
          style={[
            styles.panel,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
          ]}
        >
          <ConversationLog entries={conversation} />
        </View>

        {voice.error ? (
          <Text style={[typography.caption, { color: colors.danger }]}>{voice.error}</Text>
        ) : null}

        <View style={styles.controls}>
          <View style={[styles.actions, { gap: spacing.sm }]}>
            <Button label="Undo" variant="secondary" onPress={() => handleCommand('undo')} />
            <Button
              label="Hint"
              variant="secondary"
              disabled={gameOver}
              onPress={() => handleCommand('hint')}
            />
          </View>

          {/*
            The mic stays live even when the board is not: "new game", "undo"
            and "what's the position?" all need to work on a finished board or
            while the engine is thinking. Moving out of turn is refused with a
            spoken explanation, which is far friendlier than a dead button.
          */}
          <MicButton
            state={voice.state}
            level={voice.level}
            mode={voiceMode}
            disabled={!voiceEnabled}
            onStart={voice.start}
            onStop={voice.stop}
          />

          <View style={[styles.actions, { gap: spacing.sm }]}>
            <Button label="Flip" variant="secondary" onPress={() => handleCommand('flip-board')} />
            {gameOver ? (
              <Button label="New game" onPress={() => handleCommand('new-game')} />
            ) : (
              <Button label="Resign" variant="danger" onPress={() => handleCommand('resign')} />
            )}
          </View>
        </View>

        <View style={[styles.typeRow, { gap: spacing.sm }]}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={submitTyped}
            placeholder="…or type a move: Nf3, e4, castle"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            accessibilityLabel="Type a move"
            style={[
              typography.body,
              {
                flex: 1,
                color: colors.text,
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
          />
          <Button label="Play" onPress={submitTyped} disabled={!typed.trim()} />
        </View>
      </View>

      <PromotionSheet
        visible={pendingPromotion !== null}
        color={snapshot.turn}
        square={pendingPromotion?.to ?? null}
        onChoose={choosePromotion}
        onCancel={() => useGameStore.getState().cancelPromotion()}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // `flex: 1` here is what makes the board adaptive: it claims the leftover
  // space, and `onLayout` reports how much that turned out to be.
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { height: 96, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flex: 1 },
  typeRow: { flexDirection: 'row', alignItems: 'center' },
});
