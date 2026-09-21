import type { Theme } from '#shared/types'

const RADII: Record<Theme['radius'], string> = {
  none: '0px', sm: '4px', md: '10px', lg: '18px', full: '999px',
}

/** Maps a store's theme onto the CSS variables the `.st-` styles consume. */
export function themeVars(theme: Theme): Record<string, string> {
  return {
    '--st-primary': theme.palette.primary,
    '--st-on-primary': theme.palette.onPrimary,
    '--st-background': theme.palette.background,
    '--st-surface': theme.palette.surface,
    '--st-text': theme.palette.text,
    '--st-muted': theme.palette.muted,
    '--st-border': theme.palette.border,
    '--st-accent': theme.palette.accent,
    '--st-font-heading': theme.fonts.heading,
    '--st-font-body': theme.fonts.body,
    '--st-radius': RADII[theme.radius] ?? '10px',
  }
}
