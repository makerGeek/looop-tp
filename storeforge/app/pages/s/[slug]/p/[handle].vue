<script setup lang="ts">
import type { Brand, ProductRecord, StoreSettings, Theme } from '#shared/types'
import { formatMoney } from '#shared/money'

definePageMeta({ layout: false })

interface ProductPayload {
  store: { name: string, slug: string, brand: Brand, theme: Theme, settings: StoreSettings }
  product: ProductRecord
  related: ProductRecord[]
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const handle = computed(() => String(route.params.handle))

const { data, error } = await useFetch<ProductPayload>(
  () => `/api/storefront/${slug.value}/product`,
  { query: { handle } },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })
}

const cart = useCart(slug.value)
const selectedVariant = ref<string | null>(data.value?.product.variants[0]?.id ?? null)
const added = ref(false)

const activeVariant = computed(() =>
  data.value?.product.variants.find(v => v.id === selectedVariant.value) ?? null,
)

const price = computed(() =>
  activeVariant.value?.priceCents ?? data.value?.product.priceCents ?? 0,
)

const soldOut = computed(() => {
  const p = data.value?.product
  if (!p) return true
  return activeVariant.value ? activeVariant.value.inventory === 0 : p.inventory === 0
})

async function addToCart() {
  await cart.add(handle.value, selectedVariant.value, 1)
  if (!cart.error.value) {
    added.value = true
    setTimeout(() => { added.value = false }, 2200)
  }
}

useHead(() => ({ title: data.value ? `${data.value.product.title} — ${data.value.store.name}` : 'Product' }))
</script>

<template>
  <StorefrontShell
    v-if="data"
    :slug="slug"
    :store-name="data.store.name"
    :brand="data.store.brand"
    :theme="data.store.theme"
    :settings="data.store.settings"
  >
    <div class="st-wrap">
      <div class="st-pdp">
        <div class="st-pdp__media">
          <img :src="data.product.image ?? ''" :alt="data.product.title">
        </div>

        <div>
          <h1>{{ data.product.title }}</h1>

          <div class="st-pdp__price">
            <span>{{ formatMoney(price, data.store.settings.currency) }}</span>
            <span
              v-if="data.product.compareAtCents && data.product.compareAtCents > price"
              class="st-card__was"
            >
              {{ formatMoney(data.product.compareAtCents, data.store.settings.currency) }}
            </span>
          </div>

          <p v-if="data.product.description" class="st-pdp__desc">
            {{ data.product.description }}
          </p>

          <div v-if="data.product.variants.length" class="st-variants">
            <button
              v-for="variant in data.product.variants"
              :key="variant.id"
              class="st-variant"
              :class="{ 'is-active': variant.id === selectedVariant }"
              :disabled="variant.inventory === 0"
              @click="selectedVariant = variant.id"
            >
              {{ variant.title }}
            </button>
          </div>

          <button
            class="st-btn st-btn--block"
            :disabled="soldOut || cart.pending.value"
            @click="addToCart"
          >
            <template v-if="soldOut">Sold out</template>
            <template v-else-if="added">Added to cart ✓</template>
            <template v-else-if="cart.pending.value">Adding…</template>
            <template v-else>Add to cart</template>
          </button>

          <p v-if="cart.error.value" style="color: #b91c1c; font-size: 14px; margin-top: 12px;">
            {{ cart.error.value }}
          </p>

          <div class="st-pdp__meta">
            <div v-if="data.product.collection">Collection: {{ data.product.collection }}</div>
            <div v-if="data.product.tags.length">Tags: {{ data.product.tags.join(', ') }}</div>
            <div v-if="!soldOut">
              {{ activeVariant ? activeVariant.inventory : data.product.inventory }} in stock
            </div>
            <div v-if="data.store.settings.freeShippingThresholdCents">
              Free shipping over
              {{ formatMoney(data.store.settings.freeShippingThresholdCents, data.store.settings.currency) }}
            </div>
          </div>
        </div>
      </div>

      <section v-if="data.related.length" class="st-section">
        <div class="st-section__head">
          <h2>You might also like</h2>
        </div>
        <div class="st-products" data-cols="4">
          <StorefrontProductCard
            v-for="item in data.related"
            :key="item.id"
            :product="item"
            :slug="slug"
            :currency="data.store.settings.currency"
          />
        </div>
      </section>
    </div>
  </StorefrontShell>
</template>
