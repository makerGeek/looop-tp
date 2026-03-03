<template>
  <div class="info-page">
    <div class="info-card glass">
      <h2 class="info-title">Privacy Policy</h2>
      <div class="info-content">
        <p class="info-meta">Last updated: March 3, 2026</p>

        <p>
          Your privacy is important to us. This Privacy Policy explains how Todo handles your information when you use our application.
        </p>

        <h3>1. Information We Collect</h3>
        <p>
          <strong>We do not collect any personal information.</strong> Todo is a client-side application that runs entirely in your browser. All task data, preferences, and settings are stored locally on your device using your browser's local storage.
        </p>

        <h3>2. Data Storage</h3>
        <p>
          All data you create in Todo &mdash; including tasks, priorities, tags, deadlines, and theme preferences &mdash; is stored exclusively in your browser's local storage. This data never leaves your device and is not transmitted to any server.
        </p>

        <h3>3. No Cookies or Tracking</h3>
        <p>
          Todo does not use cookies, analytics tools, or any form of tracking. We do not monitor your usage patterns, collect device information, or track your behavior in any way.
        </p>

        <h3>4. No Third-Party Services</h3>
        <p>
          Todo does not integrate with any third-party services that could collect your data. There are no advertisements, social media trackers, or external APIs that receive your information.
        </p>

        <h3>5. Data Retention and Deletion</h3>
        <p>
          Since all data is stored locally in your browser, you have full control over your data at all times. You can delete your data by clearing your browser's local storage or site data. Uninstalling or clearing browser data will permanently remove all Todo data from your device.
        </p>

        <h3>6. Children's Privacy</h3>
        <p>
          Todo does not knowingly collect any information from children. Since no data is collected from any user, there are no special considerations for children's privacy.
        </p>

        <h3>7. Changes to This Policy</h3>
        <p>
          We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated revision date. Your continued use of the application after any changes constitutes acceptance of the updated policy.
        </p>

        <h3>8. Contact</h3>
        <p>
          If you have any questions about this Privacy Policy, please reach out through the project's repository or contact channels.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Privacy Policy - Todo'
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

.info-content strong {
  color: var(--color-text);
  font-weight: 600;
}
</style>
