<script setup lang="ts">
import type { Brand, OrderRecord, Theme } from '#shared/types'
import { formatMoney } from '#shared/money'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const orderId = computed(() => String(route.params.orderId))

const { data, error } = await useFetch<{
  store: { name: string, slug: string, brand: Brand, theme: Theme }
  order: OrderRecord
}>(() => `/api/storefront/${slug.value}/order`, { query: { id: orderId } })

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Order not found', fatal: true })
}

const style = computed(() => data.value ? themeVars(data.value.store.theme) : {})

useHead(() => ({ title: `Order confirmed — ${data.value?.store.name ?? 'Store'}` }))
</script>

<template>
  <div v-if="data" class="st-root" :style="style">
    <div class="st-wrap">
      <div class="st-confirm">
        <div class="st-confirm__tick">✓</div>
        <h1>Thank you</h1>
        <p>Order <strong>#{{ data.order.number }}</strong> is confirmed.</p>
        <p>We sent a receipt to {{ data.order.email }}.</p>

        <div style="text-align: left; margin-top: 40px; border-top: 1px solid var(--st-border); padding-top: 26px;">
          <div
            v-for="line in data.order.lines"
            :key="`${line.productId}:${line.variantId ?? ''}`"
            style="display: flex; justify-content: space-between; gap: 16px; padding: 9px 0;"
          >
            <span>
              {{ line.title }}
              <template v-if="line.variantTitle"> ({{ line.variantTitle }})</template>
              × {{ line.quantity }}
            </span>
            <span>{{ formatMoney(line.unitPriceCents * line.quantity, data.order.currency) }}</span>
          </div>
          <div class="st-totals__row st-totals__row--grand">
            <span>Total paid</span>
            <span>{{ formatMoney(data.order.totals.totalCents, data.order.currency) }}</span>
          </div>

          <p style="font-size: 13px; color: var(--st-muted); margin-top: 22px;">
            Shipping to {{ data.order.shipping.name }}, {{ data.order.shipping.address1 }},
            {{ data.order.shipping.city }} {{ data.order.shipping.postal }}, {{ data.order.shipping.country }}
          </p>
          <p style="font-size: 13px; color: var(--st-muted);">
            Payment reference <span style="font-family: monospace;">{{ data.order.paymentRef }}</span>
            — simulated, no money moved.
          </p>
        </div>

        <NuxtLink class="st-btn" style="margin-top: 32px;" :to="`/s/${slug}`">
          Back to the store
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
