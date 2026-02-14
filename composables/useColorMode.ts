export type ColorMode = 'system' | 'light' | 'dark'
export type ResolvedColorMode = 'light' | 'dark'

const STORAGE_KEY = 'todo-app-color-mode'

function loadPreference(): ColorMode {
  if (import.meta.server) return 'system'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
    return 'system'
  } catch {
    return 'system'
  }
}

function savePreference(mode: ColorMode): void {
  if (import.meta.server) return
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function getSystemTheme(): ResolvedColorMode {
  if (import.meta.server) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useColorMode = () => {
  const preference = useState<ColorMode>('color-mode', () => 'system')
  const resolved = useState<ResolvedColorMode>('color-mode-resolved', () => 'light')

  function applyTheme(mode: ResolvedColorMode): void {
    if (import.meta.server) return
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(mode)

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', mode === 'dark' ? '#1a1025' : '#d9c8ee')
    }
  }

  function resolve(mode: ColorMode): ResolvedColorMode {
    if (mode === 'system') return getSystemTheme()
    return mode
  }

  function setColorMode(mode: ColorMode): void {
    preference.value = mode
    resolved.value = resolve(mode)
    savePreference(mode)
    applyTheme(resolved.value)
  }

  // Initialize on client
  if (import.meta.client) {
    // Load saved preference
    const saved = loadPreference()
    preference.value = saved
    resolved.value = resolve(saved)
    applyTheme(resolved.value)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (preference.value === 'system') {
        resolved.value = getSystemTheme()
        applyTheme(resolved.value)
      }
    })
  }

  return {
    preference,
    resolved,
    setColorMode
  }
}
