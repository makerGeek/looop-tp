/**
 * Design tokens.
 *
 * A single source of truth for colour, spacing, radius, typography and motion.
 * Components never hard-code a hex value; they read from the active `Theme`
 * handed down by `ThemeProvider`. That keeps light/dark parity honest and makes
 * a future re-skin a one-file change.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
} as const;

/** Motion is centralised so every animation in the app shares one feel. */
export const motion = {
  /** Piece slide. Slightly over-damped: confident, never bouncy. */
  piece: { damping: 22, stiffness: 220, mass: 0.9 },
  /** Sheets and overlays. */
  sheet: { damping: 26, stiffness: 260, mass: 1 },
  /** Micro-interactions (press states, pulses). */
  quick: { duration: 140 },
  medium: { duration: 240 },
} as const;

export interface ThemePalette {
  /** App background, furthest back. */
  background: string;
  /** Raised surface (cards, sheets, bars). */
  surface: string;
  /** Surface one step higher (inputs, chips). */
  surfaceAlt: string;
  /** Hairline separators. */
  border: string;

  text: string;
  textMuted: string;
  textFaint: string;

  /** Brand accent — primary actions, active states. */
  accent: string;
  accentText: string;
  accentSoft: string;

  /** Board */
  boardLight: string;
  boardDark: string;
  boardBorder: string;
  lastMove: string;
  selected: string;
  legalDot: string;
  checkGlow: string;

  /** Pieces */
  pieceWhite: string;
  pieceWhiteEdge: string;
  pieceBlack: string;
  pieceBlackEdge: string;

  /** Semantic */
  positive: string;
  warning: string;
  danger: string;
  listening: string;
}

export interface Theme {
  name: 'light' | 'dark';
  colors: ThemePalette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  motion: typeof motion;
}

const darkPalette: ThemePalette = {
  background: '#0E1116',
  surface: '#161B22',
  surfaceAlt: '#1D242E',
  border: '#2A323D',

  text: '#ECF1F8',
  textMuted: '#9AA6B6',
  textFaint: '#66717F',

  accent: '#7C5CFF',
  accentText: '#FFFFFF',
  accentSoft: 'rgba(124, 92, 255, 0.16)',

  boardLight: '#B9C2CE',
  boardDark: '#5A6675',
  boardBorder: '#2A323D',
  lastMove: 'rgba(255, 205, 92, 0.38)',
  selected: 'rgba(124, 92, 255, 0.42)',
  legalDot: 'rgba(14, 17, 22, 0.32)',
  checkGlow: 'rgba(232, 84, 92, 0.55)',

  pieceWhite: '#F7F9FC',
  pieceWhiteEdge: '#2A323D',
  pieceBlack: '#1A2029',
  pieceBlackEdge: '#0A0D12',

  positive: '#3FBF7F',
  warning: '#E8A54B',
  danger: '#E8545C',
  listening: '#4BB8E8',
};

const lightPalette: ThemePalette = {
  background: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F7',
  border: '#DDE3EC',

  text: '#141A22',
  textMuted: '#5A6675',
  textFaint: '#8B96A5',

  accent: '#5B3DF5',
  accentText: '#FFFFFF',
  accentSoft: 'rgba(91, 61, 245, 0.12)',

  boardLight: '#EEE3D0',
  boardDark: '#A67C56',
  boardBorder: '#DDE3EC',
  lastMove: 'rgba(255, 193, 61, 0.45)',
  selected: 'rgba(91, 61, 245, 0.34)',
  legalDot: 'rgba(20, 26, 34, 0.24)',
  checkGlow: 'rgba(214, 60, 68, 0.5)',

  pieceWhite: '#FFFFFF',
  pieceWhiteEdge: '#3A424E',
  pieceBlack: '#2B333F',
  pieceBlackEdge: '#141A22',

  positive: '#1E9E62',
  warning: '#C7802A',
  danger: '#D63C44',
  listening: '#2790C4',
};

export const themes: Record<'light' | 'dark', Theme> = {
  dark: { name: 'dark', colors: darkPalette, spacing, radius, typography, motion },
  light: { name: 'light', colors: lightPalette, spacing, radius, typography, motion },
};
