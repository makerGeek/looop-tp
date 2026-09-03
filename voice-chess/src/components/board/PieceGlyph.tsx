import React, { memo } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import type { Color, PieceSymbol } from '@/chess/types';

/**
 * Chess pieces as original vector art.
 *
 * Drawn from primitives rather than licensed from an existing set, in a flat
 * geometric style that stays legible at 32pt on a phone and scales cleanly to a
 * tablet. Every piece shares the same plinth and the same 45×45 canvas, so the
 * set reads as one family on the board.
 */

const VIEW_BOX = '0 0 45 45';

/** The plinth every piece stands on — the strongest cue for "this is a piece". */
const BASE = 'M9 33.5 h27 a2.5 2.5 0 0 1 2.5 2.5 v3 h-32 v-3 a2.5 2.5 0 0 1 2.5 -2.5 z';

const BODIES: Record<PieceSymbol, React.ReactNode> = {
  p: (
    <G>
      <Circle cx={22.5} cy={12.5} r={5.6} />
      {/* Stem, then a flared skirt that meets the plinth — the silhouette that
          keeps a pawn distinct from a bishop at 32pt. */}
      <Path d="M16 20 q6.5 4 13 0 c0 4 -2 6 -2.5 8.5 h-8 c-0.5 -2.5 -2.5 -4.5 -2.5 -8.5 z" />
      <Path d="M13 28.5 h19 l1.5 5 h-22 z" />
      <Path d={BASE} />
    </G>
  ),
  n: (
    <G>
      <Path d="M13 34 c0 -7 1.5 -11.5 5.5 -15.5 c2 -2 2.5 -3.5 1.5 -5 l-3.5 3 c-2 -2.5 -1 -5.5 1.5 -7.5 c1 -1 2 -2.5 2.5 -4.5 c1.5 1.8 3 2.4 5 2.4 c7 0 11 6.2 11 15.1 c0 4.6 -0.8 8.4 -2.2 11.5 z" />
      <Circle cx={26.5} cy={14.5} r={1.5} fill="#00000055" stroke="none" />
      <Path d={BASE} />
    </G>
  ),
  b: (
    <G>
      <Circle cx={22.5} cy={6.8} r={2.4} />
      {/* A pointed mitre rather than a dome: the apex is what reads as bishop. */}
      <Path d="M22.5 9 c6.5 6.8 9 11.2 9 15.7 c0 4.6 -4 7.4 -9 7.4 s-9 -2.8 -9 -7.4 c0 -4.5 2.5 -8.9 9 -15.7 z" />
      <Path d="M25.8 15.4 l-6.4 7.6" fill="none" strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M14.5 29.5 h16 v4 h-16 z" />
      <Path d={BASE} />
    </G>
  ),
  r: (
    <G>
      <Path d="M11 8.5 h4.5 v3.5 h4.5 v-3.5 h5 v3.5 h4.5 v-3.5 h4.5 v8.5 h-23 z" />
      <Path d="M14 18.5 h17 l-1.5 15 h-14 z" />
      <Path d={BASE} />
    </G>
  ),
  q: (
    <G>
      <Path d="M8.5 17.5 l2.5 -8.5 l3.5 6.5 l4 -9.5 l4 9.5 l4 -9.5 l4 9.5 l3.5 -6.5 l2.5 8.5 z" />
      <Circle cx={8.5} cy={8} r={2.2} />
      <Circle cx={22.5} cy={5.5} r={2.4} />
      <Circle cx={36.5} cy={8} r={2.2} />
      <Path d="M11 19 h23 l-2.5 14.5 h-18 z" />
      <Path d={BASE} />
    </G>
  ),
  k: (
    <G>
      <Path d="M21 3.5 h3 v4 h4 v3 h-4 v4 h-3 v-4 h-4 v-3 h4 z" />
      <Path d="M22.5 15 c6 0 10.5 4 10.5 9 c0 4 -1 6.5 -1.5 9.5 h-18 c-0.5 -3 -1.5 -5.5 -1.5 -9.5 c0 -5 4.5 -9 10.5 -9 z" />
      <Path d={BASE} />
    </G>
  ),
};

export interface PieceGlyphProps {
  type: PieceSymbol;
  color: Color;
  size: number;
}

function PieceGlyphComponent({ type, color, size }: PieceGlyphProps) {
  const { colors } = useTheme();
  const fill = color === 'w' ? colors.pieceWhite : colors.pieceBlack;
  const stroke = color === 'w' ? colors.pieceWhiteEdge : colors.pieceBlackEdge;

  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <G
        fill={fill}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {BODIES[type]}
      </G>
    </Svg>
  );
}

export const PieceGlyph = memo(PieceGlyphComponent);
