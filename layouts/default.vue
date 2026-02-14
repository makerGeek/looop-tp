<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="container">
        <h1 class="app-title">
          <span class="app-title-icon">✦</span>
          Todo
        </h1>
      </div>
    </header>
    <main class="app-main">
      <div class="container">
        <slot />
      </div>
    </main>
  </div>
</template>

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
