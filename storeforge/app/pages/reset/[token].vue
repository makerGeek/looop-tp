<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()
const token = String(route.params.token)
const { refresh } = useAuth()

const password = ref('')
const confirm = ref('')
const pending = ref(false)
const problem = ref<string | null>(null)

async function submit() {
  if (password.value !== confirm.value) {
    problem.value = 'Those passwords do not match'
    return
  }
  pending.value = true
  problem.value = null
  try {
    await $fetch('/api/auth/reset', { method: 'POST', body: { token, password: password.value } })
    await refresh()
    await navigateTo('/dashboard')
  }
  catch (err: any) {
    problem.value = err?.data?.statusMessage ?? 'Could not reset your password'
    pending.value = false
  }
}

useHead({ title: 'Choose a new password — StoreForge' })
</script>

<template>
  <div class="sf-auth">
    <div class="sf-card sf-auth__card">
      <NuxtLink class="sf-logo" to="/" style="margin-bottom: 24px;">
        <span class="sf-logo__mark">S</span> StoreForge
      </NuxtLink>
      <h1>Choose a new password</h1>
      <p>Signing in everywhere else will be required again afterwards.</p>

      <div v-if="problem" class="sf-alert sf-alert--error">{{ problem }}</div>

      <form @submit.prevent="submit">
        <div class="sf-field">
          <label class="sf-label" for="password">New password</label>
          <input id="password" v-model="password" class="sf-input" type="password" required minlength="8" autocomplete="new-password">
        </div>
        <div class="sf-field">
          <label class="sf-label" for="confirm">Confirm</label>
          <input id="confirm" v-model="confirm" class="sf-input" type="password" required minlength="8" autocomplete="new-password">
        </div>
        <button class="sf-btn" type="submit" style="width: 100%;" :disabled="pending">
          {{ pending ? 'Saving…' : 'Set password' }}
        </button>
      </form>
    </div>
  </div>
</template>
