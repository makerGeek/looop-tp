<script setup lang="ts">
import type { StorefrontPayload } from '#shared/types'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const path = computed(() => `/${String(route.params.path)}`)

const { data, error } = await useFetch<StorefrontPayload>(
  () => `/api/storefront/${slug.value}/page`,
  { query: { path } },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

useHead(() => ({ title: data.value ? `${data.value.page.title} — ${data.value.store.name}` : 'Page' }))
</script>

<template>
  <StorefrontShell
    v-if="data"
    :slug="slug"
    :store-name="data.store.name"
    :brand="data.store.brand"
    :theme="data.store.theme"
    :settings="data.store.settings"
    :nav="data.nav"
    :is-draft="data.store.status !== 'published'"
  >
    <StorefrontSectionRenderer
      v-for="section in data.page.sections"
      :key="section.id"
      :section="section"
      :products="data.products"
      :slug="slug"
      :currency="data.store.settings.currency"
    />
  </StorefrontShell>
</template>
