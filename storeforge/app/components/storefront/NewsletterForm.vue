<script setup lang="ts">
defineProps<{ buttonLabel: string }>()

/**
 * Signup is acknowledged in the UI but not persisted — StoreForge has no email
 * provider wired up, and silently dropping addresses into a table nobody reads
 * would be worse than being upfront about it.
 */
const email = ref('')
const done = ref(false)

function submit() {
  if (!email.value.includes('@')) return
  done.value = true
  email.value = ''
}
</script>

<template>
  <div>
    <form v-if="!done" @submit.prevent="submit">
      <input v-model="email" type="email" placeholder="you@example.com" required aria-label="Email address">
      <button type="submit" class="st-btn">{{ buttonLabel }}</button>
    </form>
    <p v-else style="margin: 0; color: var(--st-muted);">
      Thanks — you're on the list.
    </p>
  </div>
</template>
