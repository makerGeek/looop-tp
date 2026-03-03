<template>
  <div class="info-page">
    <div class="info-card glass">
      <h2 class="info-title">Terms of Use</h2>
      <div class="info-content">
        <p class="info-meta">Last updated: March 3, 2026</p>

        <p>
          Welcome to Todo. By accessing or using this application, you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, please do not use the application.
        </p>

        <h3>1. Acceptance of Terms</h3>
        <p>
          By using Todo, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use. We reserve the right to update these terms at any time, and your continued use of the application constitutes acceptance of any changes.
        </p>

        <h3>2. Description of Service</h3>
        <p>
          Todo is a browser-based task management application. All data is stored locally on your device using your browser's local storage. We do not collect, transmit, or store any of your data on external servers.
        </p>

        <h3>3. User Responsibilities</h3>
        <p>
          You are responsible for maintaining the security of your device and browser. Since all data is stored locally, you are responsible for backing up any important task information. Clearing your browser data will permanently delete your tasks.
        </p>

        <h3>4. Intellectual Property</h3>
        <p>
          The Todo application, including its design, code, and visual elements, is protected by intellectual property laws. You may use the application for personal and commercial task management purposes but may not copy, modify, or distribute the application itself without permission.
        </p>

        <h3>5. Limitation of Liability</h3>
        <p>
          Todo is provided "as is" without warranties of any kind, either express or implied. We are not liable for any data loss, damages, or issues arising from the use of this application. Since data is stored locally in your browser, we cannot recover lost data.
        </p>

        <h3>6. Modifications to Service</h3>
        <p>
          We reserve the right to modify, suspend, or discontinue the application at any time without prior notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the service.
        </p>

        <h3>7. Governing Law</h3>
        <p>
          These Terms of Use shall be governed by and construed in accordance with applicable laws. Any disputes arising from the use of this application shall be resolved through appropriate legal channels.
        </p>

        <h3>8. Contact</h3>
        <p>
          If you have any questions about these Terms of Use, please reach out through the project's repository or contact channels.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Terms of Use - Todo'
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

.info-meta {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-style: italic;
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
</style>
