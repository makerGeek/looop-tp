<template>
  <div class="info-page">
    <div class="info-card glass">
      <h2 class="info-title">About</h2>
      <div class="info-content">
        <p>
          <strong>Todo</strong> is a simple, elegant task management app designed to help you stay organized and productive.
        </p>
        <p>
          Built with a modern liquid glass design, Todo makes managing your daily tasks a delightful experience. Whether you're tracking work projects, personal goals, or everyday errands, Todo keeps everything in one place.
        </p>

        <h3>Features</h3>
        <ul>
          <li>Create, edit, and delete tasks with ease</li>
          <li>Set priority levels &mdash; low, medium, or high</li>
          <li>Organize tasks with custom tags</li>
          <li>Set deadlines to stay on track</li>
          <li>Track your progress with completion statistics</li>
          <li>Switch between light, dark, and system themes</li>
          <li>All data is stored locally in your browser</li>
        </ul>

        <h3>Technology</h3>
        <p>
          Todo is built with <a href="https://nuxt.com" target="_blank" rel="noopener noreferrer">Nuxt 3</a> and <a href="https://vuejs.org" target="_blank" rel="noopener noreferrer">Vue.js</a>, featuring a custom liquid glass design system. Your data never leaves your device &mdash; everything is stored securely in your browser's local storage.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'About - Todo'
})
</script>

<style scoped>
.info-page {
  padding-top: 0.25rem;
}

.info-card {
  border-radius: var(--radius-lg);
  padding: 2rem;
}

.info-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-content p {
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.info-content h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-top: 0.5rem;
  letter-spacing: -0.01em;
}

.info-content ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 0;
}

.info-content ul li {
  color: var(--color-text-secondary);
  padding-left: 1.25rem;
  position: relative;
  line-height: 1.6;
}

.info-content ul li::before {
  content: '✦';
  position: absolute;
  left: 0;
  color: var(--color-primary);
  font-size: 0.7rem;
  top: 0.35rem;
}

.info-content a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-base);
}

.info-content a:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.info-content strong {
  color: var(--color-text);
  font-weight: 600;
}
</style>
