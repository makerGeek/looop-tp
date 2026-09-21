<script setup lang="ts">
import type { StorefrontPayload } from '#shared/types'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data, error } = await useFetch<StorefrontPayload>(
  () => `/api/storefront/${slug.value}/page`,
  { query: { path: '/' } },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Store not found', fatal: true })
}

useHead(() => ({
  title: data.value ? `${data.value.store.name}${data.value.store.brand.tagline ? ' — ' + data.value.store.brand.tagline : ''}` : 'Store',
  meta: [{ name: 'description', content: data.value?.store.brand.tagline ?? '' }],
}))
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
    <div v-if="!data.page.sections.length" class="st-empty-state">
      <h2>Nothing here yet</h2>
      <p>This store hasn't been built. Head back to the builder and describe what you want.</p>
    </div>
  </StorefrontShell>
</template>
