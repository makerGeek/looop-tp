<script setup lang="ts">
definePageMeta({ layout: 'blank' })
useHead({ title: 'Sign in — StoreForge' })

const { login } = useAuth()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const pending = ref(false)

async function submit() {
  pending.value = true
  error.value = null
  try {
    await login(email.value, password.value)
    await navigateTo(String(route.query.next ?? '/dashboard'))
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage ?? 'Could not sign you in'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="sf-auth">
    <div class="sf-card sf-auth__card">
      <NuxtLink class="sf-logo" to="/" style="margin-bottom: 24px;">
        <span class="sf-logo__mark">S</span> StoreForge
      </NuxtLink>
      <h1>Welcome back</h1>
      <p>Sign in to your stores.</p>

      <div v-if="error" class="sf-alert sf-alert--error">{{ error }}</div>

      <form @submit.prevent="submit">
        <div class="sf-field">
          <label class="sf-label" for="email">Email</label>
          <input id="email" v-model="email" class="sf-input" type="email" required autocomplete="email">
        </div>
        <div class="sf-field">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <label class="sf-label" for="password">Password</label>
            <NuxtLink to="/forgot" class="sf-faint" style="font-size: 12.5px;">Forgot?</NuxtLink>
          </div>
          <input id="password" v-model="password" class="sf-input" type="password" required autocomplete="current-password">
        </div>
        <button class="sf-btn" type="submit" style="width: 100%;" :disabled="pending">
          <span v-if="pending" class="sf-spin" />
          {{ pending ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="sf-muted" style="margin: 20px 0 0; font-size: 14px; text-align: center;">
        No account? <NuxtLink to="/signup" style="color: var(--sf-accent);">Create one</NuxtLink>
      </p>
    </div>
  </div>
</template>
