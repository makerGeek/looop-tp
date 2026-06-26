// Single source of truth for the visual language. Primitives reference these
// values rather than hard-coding hex codes, so theming is one file away.
export const tokens = {
  color: {
    bg: "#ffffff",
    fg: "#0f172a",
    muted: "#f1f5f9",
    border: "#cbd5e1",
    primary: "#2563eb",
    primaryFg: "#ffffff",
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  font: {
    sans: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
} as const;

export type Tokens = typeof tokens;
