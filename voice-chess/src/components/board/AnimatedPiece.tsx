import React, { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { squareToXY, xyToSquare } from '@/chess/board';
import type { Color, PieceSymbol, Square } from '@/chess/types';
import { motion } from '@/theme/tokens';
import { PieceGlyph } from './PieceGlyph';

export interface AnimatedPieceProps {
  square: Square;
  type: PieceSymbol;
  color: Color;
  squareSize: number;
  orientation: Color;
  /**
   * Where this piece came from on the move that just happened. The piece mounts
   * offset by that delta and springs to zero, which reads as a slide.
   */
  animateFrom?: Square;
  draggable: boolean;
  /** Drawn above its neighbours — used while a piece is picked up. */
  elevated: boolean;
  onTap(square: Square): void;
  onDrop(from: Square, to: Square): void;
  onDragStart(square: Square): void;
}

function AnimatedPieceComponent({
  square,
  type,
  color,
  squareSize,
  orientation,
  animateFrom,
  draggable,
  elevated,
  onTap,
  onDrop,
  onDragStart,
}: AnimatedPieceProps) {
  const { col, row } = squareToXY(square, orientation);
  const origin = animateFrom ? squareToXY(animateFrom, orientation) : null;

  // Offsets are relative to the piece's final home square, so the resting
  // value is always zero and every animation is "return to place".
  const offsetX = useSharedValue(origin ? (origin.col - col) * squareSize : 0);
  const offsetY = useSharedValue(origin ? (origin.row - row) * squareSize : 0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const lifted = useSharedValue(0);

  useEffect(() => {
    offsetX.value = withSpring(0, motion.piece);
    offsetY.value = withSpring(0, motion.piece);
    // Runs once per mount: a piece only ever animates in from its origin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = Gesture.Pan()
    .enabled(draggable)
    .onStart(() => {
      lifted.value = withTiming(1, motion.quick);
      runOnJS(onDragStart)(square);
    })
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = event.translationY;
    })
    .onEnd((event) => {
      const droppedCol = col + Math.round(event.translationX / squareSize);
      const droppedRow = row + Math.round(event.translationY / squareSize);
      const destination = xyToSquare(droppedCol, droppedRow, orientation);

      lifted.value = withTiming(0, motion.quick);
      dragX.value = withSpring(0, motion.piece);
      dragY.value = withSpring(0, motion.piece);

      if (destination && destination !== square) runOnJS(onDrop)(square, destination);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)(square);
  });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value + dragX.value },
      { translateY: offsetY.value + dragY.value },
      { scale: 1 + lifted.value * 0.12 },
    ],
    shadowOpacity: lifted.value * 0.35,
  }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View
        accessibilityRole="image"
        accessibilityLabel={`${color === 'w' ? 'White' : 'Black'} ${type} on ${square}`}
        style={[
          styles.piece,
          {
            width: squareSize,
            height: squareSize,
            left: col * squareSize,
            top: row * squareSize,
            // zIndex is a layout property, so it is set from props rather than
            // from the animated style — a lifted piece must never slide under
            // the one it is passing over.
            zIndex: elevated ? 20 : 1,
          },
          style,
        ]}
      >
        <PieceGlyph type={type} color={color} size={squareSize * 0.86} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});

export const AnimatedPiece = memo(AnimatedPieceComponent);
