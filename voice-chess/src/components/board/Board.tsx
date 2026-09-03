import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { FILES, RANKS, squareToXY } from '@/chess/board';
import type { Color, Move, MoveRecord, PositionSnapshot, Square } from '@/chess/types';
import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedPiece } from './AnimatedPiece';
import { BoardSquare } from './Square';

export interface BoardProps {
  size: number;
  snapshot: PositionSnapshot;
  orientation: Color;
  selected: Square | null;
  /** Legal moves out of the selected square. */
  targets: Move[];
  lastMove: MoveRecord | null;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  interactive: boolean;
  onSquarePress(square: Square): void;
  onDrop(from: Square, to: Square): void;
}

/**
 * The board.
 *
 * Deliberately presentational: it takes a position and some highlights and
 * emits square presses. All rules, selection logic and voice handling live
 * outside, which is what lets the same board render a CPU game, a pass-and-play
 * game and (later) an online one without changes.
 */
export function Board({
  size,
  snapshot,
  orientation,
  selected,
  targets,
  lastMove,
  showCoordinates,
  showLegalMoves,
  interactive,
  onSquarePress,
  onDrop,
}: BoardProps) {
  const { colors, radius } = useTheme();
  const squareSize = size / 8;

  const targetMap = useMemo(() => {
    const map = new Map<Square, 'move' | 'capture'>();
    if (!showLegalMoves) return map;
    for (const move of targets) {
      map.set(move.to, move.isCapture() ? 'capture' : 'move');
    }
    return map;
  }, [showLegalMoves, targets]);

  /**
   * Which square each piece slid in from. Castling moves two pieces, and the
   * rook deserves the same animation as the king.
   */
  const animateFrom = useMemo(() => {
    const map = new Map<Square, Square>();
    if (!lastMove) return map;
    map.set(lastMove.to, lastMove.from);
    if (lastMove.isCastle) {
      const rank = lastMove.color === 'w' ? '1' : '8';
      if (lastMove.isKingsideCastle) map.set(`f${rank}` as Square, `h${rank}` as Square);
      else map.set(`d${rank}` as Square, `a${rank}` as Square);
    }
    return map;
  }, [lastMove]);

  const checkSquare = useMemo(() => {
    if (!snapshot.inCheck) return null;
    for (const row of snapshot.board) {
      for (const piece of row) {
        if (piece && piece.type === 'k' && piece.color === snapshot.turn) return piece.square;
      }
    }
    return null;
  }, [snapshot.board, snapshot.inCheck, snapshot.turn]);

  const squares = useMemo(() => {
    const list: { square: Square; left: number; top: number; file?: string; rank?: string }[] = [];
    for (const file of FILES) {
      for (const rank of RANKS) {
        const square = `${file}${rank}` as Square;
        const { col, row } = squareToXY(square, orientation);
        list.push({
          square,
          left: col * squareSize,
          top: row * squareSize,
          // Coordinates go on the outer edge only, the way a printed board has them.
          file: showCoordinates && row === 7 ? file : undefined,
          rank: showCoordinates && col === 0 ? rank : undefined,
        });
      }
    }
    return list;
  }, [orientation, showCoordinates, squareSize]);

  const pieces = useMemo(
    () => snapshot.board.flat().filter((piece): piece is NonNullable<typeof piece> => piece !== null),
    [snapshot.board]
  );

  const handleDragStart = useCallback(
    (square: Square) => {
      if (selected !== square) onSquarePress(square);
    },
    [onSquarePress, selected]
  );

  return (
    <View
      testID="chess-board"
      style={[
        styles.board,
        { width: size, height: size, borderRadius: radius.md, borderColor: colors.boardBorder },
      ]}
    >
      {squares.map(({ square, left, top, file, rank }) => (
        <BoardSquare
          key={square}
          square={square}
          size={squareSize}
          left={left}
          top={top}
          isSelected={selected === square}
          isLastMove={lastMove ? lastMove.from === square || lastMove.to === square : false}
          isCheck={checkSquare === square}
          target={targetMap.get(square) ?? 'none'}
          fileLabel={file}
          rankLabel={rank}
          onPress={onSquarePress}
        />
      ))}

      {pieces.map((piece) => (
        <AnimatedPiece
          key={`${piece.square}-${piece.color}${piece.type}`}
          square={piece.square}
          type={piece.type}
          color={piece.color}
          squareSize={squareSize}
          orientation={orientation}
          animateFrom={animateFrom.get(piece.square)}
          draggable={interactive && piece.color === snapshot.turn}
          elevated={selected === piece.square}
          onTap={onSquarePress}
          onDrop={onDrop}
          onDragStart={handleDragStart}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
