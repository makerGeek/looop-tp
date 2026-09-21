<script setup lang="ts">
import type { StoreRecord } from '#shared/types'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Your stores — StoreForge' })

type StoreWithCount = StoreRecord & { productCount: number, orgName: string, role: string }

const { activeOrgId, orgs } = useAuth()
const { data: stores, refresh } = await useFetch<StoreWithCount[]>('/api/stores')

/** With more than one organization, the list is scoped to the active one. */
const visible = computed(() => {
  if (!stores.value) return []
  if (orgs.value.length < 2 || !activeOrgId.value) return stores.value
  return stores.value.filter(s => s.orgId === activeOrgId.value)
})

const creating = ref(false)
const newName = ref('')
const showForm = ref(false)
const error = ref<string | null>(null)

async function createStore() {
  creating.value = true
  error.value = null
  try {
    const store = await $fetch<StoreRecord>('/api/stores', {
      method: 'POST',
      body: { name: newName.value.trim() || 'Untitled store', orgId: activeOrgId.value ?? undefined },
    })
    await navigateTo(`/builder/${store.id}`)
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage ?? 'Could not create the store'
    creating.value = false
  }
}

async function removeStore(store: StoreWithCount) {
  if (!confirm(`Delete "${store.name}"? Its pages, products and orders go with it. This cannot be undone.`)) return
  await $fetch(`/api/stores/${store.id}`, { method: 'DELETE' })
  await refresh()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="sf-page">
    <div class="sf-page__head">
      <div>
        <h1>Your stores</h1>
        <p>Each one has its own catalogue, storefront and orders.</p>
      </div>
      <button class="sf-btn" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ New store' }}
      </button>
    </div>

    <div v-if="showForm" class="sf-card sf-enter" style="margin-bottom: 24px;">
      <form @submit.prevent="createStore">
        <div class="sf-field">
          <label class="sf-label" for="storeName">Store name</label>
          <input
            id="storeName" v-model="newName" class="sf-input" autofocus
            placeholder="Northbound Coffee Roasters"
          >
          <p class="sf-faint" style="font-size: 12.5px; margin: 6px 0 0;">
            You can rename it later — the AI usually suggests something better anyway.
          </p>
        </div>
        <div v-if="error" class="sf-alert sf-alert--error">{{ error }}</div>
        <button class="sf-btn" type="submit" :disabled="creating">
          <span v-if="creating" class="sf-spin" />
          {{ creating ? 'Creating…' : 'Create and start building' }}
        </button>
      </form>
    </div>

    <div v-if="!visible.length" class="sf-card sf-empty">
      <h3>No stores yet</h3>
      <p>Create one and describe what you want to sell.</p>
    </div>

    <div v-else class="sf-grid sf-grid--3">
      <div v-for="store in visible" :key="store.id" class="sf-card">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
          <div style="min-width: 0;">
            <h3 style="margin: 0 0 4px; font-size: 16.5px; font-weight: 620;">{{ store.name }}</h3>
            <div class="sf-faint sf-mono" style="font-size: 12.5px;">/s/{{ store.slug }}</div>
          </div>
          <span class="sf-badge" :class="store.status === 'published' ? 'sf-badge--live' : 'sf-badge--draft'">
            {{ store.status === 'published' ? 'Live' : 'Draft' }}
          </span>
        </div>

        <p v-if="store.brand.tagline" class="sf-muted" style="font-size: 13.5px; margin: 12px 0 0;">
          {{ store.brand.tagline }}
        </p>

        <div class="sf-faint" style="font-size: 12.5px; margin-top: 14px;">
          {{ store.productCount }} product{{ store.productCount === 1 ? '' : 's' }}
          · updated {{ formatDate(store.updatedAt) }}
          <template v-if="orgs.length > 1"> · {{ store.orgName }}</template>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap;">
          <NuxtLink class="sf-btn sf-btn--sm" :to="`/builder/${store.id}`">Build</NuxtLink>
          <NuxtLink class="sf-btn sf-btn--ghost sf-btn--sm" :to="`/admin/${store.id}`">Admin</NuxtLink>
          <a class="sf-btn sf-btn--ghost sf-btn--sm" :href="`/s/${store.slug}`" target="_blank" rel="noopener">
            View ↗
          </a>
          <button class="sf-btn sf-btn--danger sf-btn--sm" @click="removeStore(store)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
