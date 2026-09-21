<script setup lang="ts">
definePageMeta({ layout: 'blank' })
useHead({ title: 'Create your account — StoreForge' })

const { signup } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const pending = ref(false)

async function submit() {
  pending.value = true
  error.value = null
  try {
    await signup(email.value, password.value, name.value)
    await navigateTo('/dashboard')
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage ?? 'Could not create your account'
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
      <h1>Start building</h1>
      <p>Your first store takes about a minute.</p>

      <div v-if="error" class="sf-alert sf-alert--error">{{ error }}</div>

      <form @submit.prevent="submit">
        <div class="sf-field">
          <label class="sf-label" for="name">Name</label>
          <input id="name" v-model="name" class="sf-input" required autocomplete="name">
        </div>
        <div class="sf-field">
          <label class="sf-label" for="email">Email</label>
          <input id="email" v-model="email" class="sf-input" type="email" required autocomplete="email">
        </div>
        <div class="sf-field">
          <label class="sf-label" for="password">Password</label>
          <input
            id="password" v-model="password" class="sf-input" type="password"
            required minlength="8" autocomplete="new-password"
          >
          <p class="sf-faint" style="font-size: 12.5px; margin: 6px 0 0;">At least 8 characters.</p>
        </div>
        <button class="sf-btn" type="submit" style="width: 100%;" :disabled="pending">
          <span v-if="pending" class="sf-spin" />
          {{ pending ? 'Creating…' : 'Create account' }}
        </button>
      </form>

      <p class="sf-muted" style="margin: 20px 0 0; font-size: 14px; text-align: center;">
        Already have one? <NuxtLink to="/login" style="color: var(--sf-accent);">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>
