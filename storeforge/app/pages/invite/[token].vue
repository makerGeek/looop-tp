<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()
const token = String(route.params.token)
const { user, refresh } = useAuth()

const { data: invite, error } = await useFetch<{ email: string, role: string, orgName: string }>(
  '/api/invitations/preview',
  { query: { token } },
)

const accepting = ref(false)
const problem = ref<string | null>(null)

async function accept() {
  accepting.value = true
  problem.value = null
  try {
    const res = await $fetch<{ needsAuth: boolean, orgName: string }>('/api/invitations/accept', {
      method: 'POST',
      body: { token },
    })
    if (res.needsAuth) {
      await navigateTo(`/signup?invite=${token}&email=${encodeURIComponent(invite.value!.email)}`)
      return
    }
    await refresh()
    await navigateTo('/dashboard')
  }
  catch (err: any) {
    problem.value = err?.data?.statusMessage ?? 'Could not accept that invitation'
    accepting.value = false
  }
}

useHead({ title: 'Invitation — StoreForge' })
</script>

<template>
  <div class="sf-auth">
    <div class="sf-card sf-auth__card">
      <NuxtLink class="sf-logo" to="/" style="margin-bottom: 24px;">
        <span class="sf-logo__mark">S</span> StoreForge
      </NuxtLink>

      <template v-if="error">
        <h1>Invitation not found</h1>
        <p>This invitation is invalid or has expired. Ask whoever invited you to send a new one.</p>
        <NuxtLink class="sf-btn sf-btn--ghost" to="/">Back to StoreForge</NuxtLink>
      </template>

      <template v-else-if="invite">
        <h1>Join {{ invite.orgName }}</h1>
        <p>
          You've been invited as {{ invite.role === 'admin' ? 'an' : 'a' }}
          <strong>{{ invite.role }}</strong> — the invitation is for {{ invite.email }}.
        </p>

        <div v-if="problem" class="sf-alert sf-alert--error">{{ problem }}</div>

        <div v-if="user && user.email !== invite.email" class="sf-alert sf-alert--info">
          You're signed in as {{ user.email }}. Sign out and sign in as {{ invite.email }} to accept.
        </div>

        <button class="sf-btn" style="width: 100%;" :disabled="accepting" @click="accept">
          <span v-if="accepting" class="sf-spin" />
          {{ accepting ? 'Joining…' : user ? 'Accept invitation' : 'Create an account to join' }}
        </button>
      </template>
    </div>
  </div>
</template>
