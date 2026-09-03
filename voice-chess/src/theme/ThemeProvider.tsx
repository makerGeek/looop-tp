import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/state/settingsStore';
import { Theme, themes } from './tokens';

const ThemeContext = createContext<Theme>(themes.dark);

/**
 * Resolves the effective theme from the user's preference plus the OS setting
 * and publishes it to the tree. Kept deliberately tiny: no styling logic lives
 * here, only resolution.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSettingsStore((s) => s.appearance);
  const system = useColorScheme();

  const theme = useMemo(() => {
    if (preference === 'system') return system === 'light' ? themes.light : themes.dark;
    return themes[preference];
  }, [preference, system]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Style helper: builds a memoised stylesheet-like object from the active theme.
 *
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = (t: Theme) => ({ root: { backgroundColor: t.colors.surface } });
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
