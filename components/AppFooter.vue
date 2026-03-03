<template>
  <footer class="app-footer">
    <div class="container footer-container">
      <nav class="footer-nav" aria-label="Footer navigation">
        <NuxtLink to="/about" class="footer-link">About</NuxtLink>
        <span class="footer-separator" aria-hidden="true">·</span>
        <NuxtLink to="/terms" class="footer-link">Terms of Use</NuxtLink>
        <span class="footer-separator" aria-hidden="true">·</span>
        <NuxtLink to="/privacy" class="footer-link">Privacy Policy</NuxtLink>
      </nav>
      <p class="footer-copy">&copy; {{ currentYear }} Todo</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<style scoped>
.app-footer {
  padding: 1.5rem 0;
  border-top: 1px solid var(--color-glass-border);
  margin-top: auto;
}

.footer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.footer-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.footer-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: color var(--transition-base);
  padding: 0.125rem 0;
}

.footer-link:hover {
  color: var(--color-primary);
}

.footer-link.router-link-active {
  color: var(--color-primary);
}

.footer-separator {
  color: var(--color-text-secondary);
  opacity: 0.4;
  font-size: 0.85rem;
  user-select: none;
}

.footer-copy {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.container {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 1rem;
}
</style>
