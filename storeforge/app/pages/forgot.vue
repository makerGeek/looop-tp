<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const email = ref('')
const pending = ref(false)
const sent = ref(false)

async function submit() {
  pending.value = true
  // The endpoint answers identically whether or not the address exists, so the
  // UI must not branch on the result either.
  await $fetch('/api/auth/request-reset', { method: 'POST', body: { email: email.value } })
  sent.value = true
  pending.value = false
}

useHead({ title: 'Reset your password — StoreForge' })
</script>

<template>
  <div class="sf-auth">
    <div class="sf-card sf-auth__card">
      <NuxtLink class="sf-logo" to="/" style="margin-bottom: 24px;">
        <span class="sf-logo__mark">S</span> StoreForge
      </NuxtLink>

      <template v-if="sent">
        <h1>Check your email</h1>
        <p>If {{ email }} has an account, a reset link is on its way. It's good for one hour.</p>
        <NuxtLink class="sf-btn sf-btn--ghost" to="/login">Back to sign in</NuxtLink>
      </template>

      <template v-else>
        <h1>Reset your password</h1>
        <p>We'll email you a link to choose a new one.</p>
        <form @submit.prevent="submit">
          <div class="sf-field">
            <label class="sf-label" for="email">Email</label>
            <input id="email" v-model="email" class="sf-input" type="email" required autocomplete="email">
          </div>
          <button class="sf-btn" type="submit" style="width: 100%;" :disabled="pending">
            {{ pending ? 'Sending…' : 'Send reset link' }}
          </button>
        </form>
        <p class="sf-muted" style="margin: 20px 0 0; font-size: 14px; text-align: center;">
          <NuxtLink to="/login" style="color: var(--sf-accent);">Back to sign in</NuxtLink>
        </p>
      </template>
    </div>
  </div>
</template>
