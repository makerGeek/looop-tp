<script setup lang="ts">
import type { ProductRecord } from '#shared/types'
import { formatMoney } from '#shared/money'

const props = defineProps<{
  product: ProductRecord
  slug: string
  currency: string
}>()

const onSale = computed(() =>
  props.product.compareAtCents !== null && props.product.compareAtCents > props.product.priceCents,
)

const discount = computed(() => {
  if (!onSale.value || !props.product.compareAtCents) return 0
  return Math.round((1 - props.product.priceCents / props.product.compareAtCents) * 100)
})
</script>

<template>
  <NuxtLink class="st-card" :to="productHref(slug, product.handle)">
    <div class="st-card__media">
      <img
        :src="product.image ?? ''"
        :alt="product.title"
        loading="lazy"
      >
      <span v-if="onSale" class="st-card__tag">{{ discount }}% off</span>
    </div>
    <h3 class="st-card__title">{{ product.title }}</h3>
    <div class="st-card__price">
      <span>{{ formatMoney(product.priceCents, currency) }}</span>
      <span v-if="onSale" class="st-card__was">
        {{ formatMoney(product.compareAtCents!, currency) }}
      </span>
    </div>
    <div v-if="product.inventory === 0" class="st-card__sold">Sold out</div>
  </NuxtLink>
</template>
