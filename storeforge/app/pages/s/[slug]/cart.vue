<script setup lang="ts">
import type { StorefrontPayload } from '#shared/types'
import { formatMoney } from '#shared/money'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug))

// The home page payload carries the chrome (brand, theme, nav) this page needs.
const { data: shell } = await useFetch<StorefrontPayload>(
  () => `/api/storefront/${slug.value}/page`,
  { query: { path: '/' } },
)

const cart = useCart(slug.value)
await cart.refresh()

const currency = computed(() => shell.value?.store.settings.currency ?? 'USD')
const isEmpty = computed(() => !cart.cart.value?.lines.length)

useHead(() => ({ title: `Cart — ${shell.value?.store.name ?? 'Store'}` }))
</script>

<template>
  <StorefrontShell
    v-if="shell"
    :slug="slug"
    :store-name="shell.store.name"
    :brand="shell.store.brand"
    :theme="shell.store.theme"
    :settings="shell.store.settings"
    :nav="shell.nav"
  >
    <div class="st-wrap" style="padding: 52px 24px 80px;">
      <h1 style="font-size: 32px; margin-bottom: 32px;">Your cart</h1>

      <div v-if="isEmpty" class="st-empty-state">
        <h2>Your cart is empty</h2>
        <p>Nothing added yet.</p>
        <NuxtLink class="st-btn" :to="`/s/${slug}`">Continue shopping</NuxtLink>
      </div>

      <template v-else>
        <div class="st-lines">
          <div
            v-for="line in cart.cart.value!.lines"
            :key="`${line.productId}:${line.variantId ?? ''}`"
            class="st-line"
          >
            <img class="st-line__img" :src="line.image ?? ''" :alt="line.title">
            <div>
              <NuxtLink :to="productHref(slug, line.handle)" class="st-line__title">
                {{ line.title }}
              </NuxtLink>
              <div v-if="line.variantTitle" class="st-line__variant">{{ line.variantTitle }}</div>
              <div class="st-line__variant">
                {{ formatMoney(line.unitPriceCents, currency) }} each
              </div>
            </div>
            <div class="st-line__right">
              <strong>{{ formatMoney(line.unitPriceCents * line.quantity, currency) }}</strong>
              <div class="st-qty">
                <button
                  :disabled="cart.pending.value"
                  aria-label="Decrease quantity"
                  @click="cart.setQuantity(line.productId, line.variantId, line.quantity - 1)"
                >−</button>
                <span>{{ line.quantity }}</span>
                <button
                  :disabled="cart.pending.value || line.quantity >= 99"
                  aria-label="Increase quantity"
                  @click="cart.setQuantity(line.productId, line.variantId, line.quantity + 1)"
                >+</button>
              </div>
              <button
                style="background: none; border: none; color: var(--st-muted); font-size: 13px; cursor: pointer; padding: 0;"
                :disabled="cart.pending.value"
                @click="cart.remove(line.productId, line.variantId)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <div class="st-totals">
          <div class="st-totals__row">
            <span>Subtotal</span>
            <span>{{ formatMoney(cart.cart.value!.totals.subtotalCents, currency) }}</span>
          </div>
          <div class="st-totals__row">
            <span>Shipping</span>
            <span>
              {{ cart.cart.value!.totals.shippingCents === 0
                ? 'Free'
                : formatMoney(cart.cart.value!.totals.shippingCents, currency) }}
            </span>
          </div>
          <div v-if="cart.cart.value!.totals.taxCents > 0" class="st-totals__row">
            <span>Tax</span>
            <span>{{ formatMoney(cart.cart.value!.totals.taxCents, currency) }}</span>
          </div>
          <div class="st-totals__row st-totals__row--grand">
            <span>Total</span>
            <span>{{ formatMoney(cart.cart.value!.totals.totalCents, currency) }}</span>
          </div>
          <NuxtLink class="st-btn st-btn--block" style="margin-top: 20px;" :to="`/s/${slug}/checkout`">
            Checkout
          </NuxtLink>
        </div>
      </template>
    </div>
  </StorefrontShell>
</template>
