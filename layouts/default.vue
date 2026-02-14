<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="container">
        <h1 class="app-title">📝 Todo App</h1>
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
}

.app-header {
  background-color: var(--color-primary);
  color: white;
  padding: 1rem 0;
  box-shadow: var(--shadow-md);
}

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
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
