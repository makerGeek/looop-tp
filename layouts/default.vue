<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="container header-container">
        <h1 class="app-title">
          <span class="app-title-icon">✦</span>
          Todo
        </h1>
        <button
          class="theme-toggle"
          :title="`Theme: ${preference} (click to change)`"
          @click="cycleTheme"
        >
          <!-- Sun icon (shown in dark mode) -->
          <svg v-if="resolved === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <!-- Moon icon (shown in light mode) -->
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span class="theme-label">{{ themeLabel }}</span>
        </button>
      </div>
    </header>
    <main class="app-main">
      <div class="container">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { ColorMode } from '~/composables/useColorMode'

const { preference, resolved, setColorMode } = useColorMode()

const themeLabel = computed(() => {
  const labels: Record<ColorMode, string> = {
    system: 'Auto',
    light: 'Light',
    dark: 'Dark'
  }
  return labels[preference.value]
})

const cycle: ColorMode[] = ['system', 'light', 'dark']

function cycleTheme() {
  const currentIndex = cycle.indexOf(preference.value)
  const nextIndex = (currentIndex + 1) % cycle.length
  setColorMode(cycle[nextIndex])
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.app-header {
  background: var(--color-glass-strong);
  backdrop-filter: blur(var(--blur-lg));
  -webkit-backdrop-filter: blur(var(--blur-lg));
  border-bottom: 1px solid var(--color-glass-border);
  padding: 1.25rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.04);
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: -0.02em;
}

.app-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: linear-gradient(135deg, var(--color-primary), #a78bfa);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  box-shadow: 0 2px 8px var(--color-primary-glow);
  transition: transform var(--transition-spring),
              box-shadow var(--transition-base),
              filter var(--transition-base);
}

.app-title:hover .app-title-icon {
  transform: scale(1.12) rotate(-4deg);
  box-shadow: 0 4px 16px var(--color-primary-glow);
  filter: brightness(1.12);
}

.app-title:active .app-title-icon {
  transform: scale(0.95) rotate(0deg);
  transition-duration: 0.1s;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-glass);
  border: 1px solid var(--color-glass-border);
  border-radius: 9999px;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base),
              transform var(--transition-spring);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.theme-toggle:hover {
  background: var(--color-glass-hover);
  border-color: var(--color-glass-border-strong);
  color: var(--color-text);
  transform: translateY(-1px) scale(1.03);
  box-shadow: var(--shadow-glass-hover);
}

.theme-toggle:active {
  transform: translateY(0) scale(0.97);
  transition-duration: 0.1s;
}

.theme-label {
  line-height: 1;
}

.app-main {
  flex: 1;
  padding: 2rem 0;
}

.container {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 1rem;
}
</style>
