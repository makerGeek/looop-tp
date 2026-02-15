export type ColorMode = 'system' | 'light' | 'dark'
export type ResolvedColorMode = 'light' | 'dark'

const STORAGE_KEY = 'todo-app-color-mode'

function loadPreference(): ColorMode {
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
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function getSystemTheme(): ResolvedColorMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ResolvedColorMode): void {
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

// Module-level initialized flag to ensure we only set up listeners once
let initialized = false

export const useColorMode = () => {
  const preference = useState<ColorMode>('color-mode', () => 'system')
  const resolved = useState<ResolvedColorMode>('color-mode-resolved', () => 'light')

  function setColorMode(mode: ColorMode): void {
    preference.value = mode
    resolved.value = resolve(mode)
    savePreference(mode)
    applyTheme(resolved.value)
  }

  // Initialize on client after mount to avoid hydration mismatches
  if (import.meta.client) {
    onMounted(() => {
      // Load saved preference and apply theme
      const saved = loadPreference()
      preference.value = saved
      resolved.value = resolve(saved)
      applyTheme(resolved.value)

      // Only set up the system theme change listener once
      if (!initialized) {
        initialized = true
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', () => {
          if (preference.value === 'system') {
            resolved.value = getSystemTheme()
            applyTheme(resolved.value)
          }
        })
      }
    })
  }

  return {
    preference,
    resolved,
    setColorMode
  }
}
