<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()
const { refresh } = useAuth()

const state = ref<'working' | 'done' | 'failed'>('working')
const problem = ref<string | null>(null)

onMounted(async () => {
  try {
    await $fetch('/api/auth/verify', { method: 'POST', body: { token: String(route.params.token) } })
    await refresh()
    state.value = 'done'
  }
  catch (err: any) {
    problem.value = err?.data?.statusMessage ?? 'That confirmation link did not work'
    state.value = 'failed'
  }
})

useHead({ title: 'Confirming your email — StoreForge' })
</script>

<template>
  <div class="sf-auth">
    <div class="sf-card sf-auth__card" style="text-align: center;">
      <NuxtLink class="sf-logo" to="/" style="margin-bottom: 24px; justify-content: center;">
        <span class="sf-logo__mark">S</span> StoreForge
      </NuxtLink>

      <template v-if="state === 'working'">
        <h1>Confirming…</h1>
        <p>One moment.</p>
      </template>

      <template v-else-if="state === 'done'">
        <h1>Email confirmed</h1>
        <p>You're all set.</p>
        <NuxtLink class="sf-btn" to="/dashboard">Go to your stores</NuxtLink>
      </template>

      <template v-else>
        <h1>That link didn't work</h1>
        <p>{{ problem }}</p>
        <NuxtLink class="sf-btn sf-btn--ghost" to="/dashboard">Back to your stores</NuxtLink>
      </template>
    </div>
  </div>
</template>
