<script setup lang="ts">
import type { StorefrontPayload } from '#shared/types'
import { formatMoney } from '#shared/money'

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const slug = computed(() => String(route.params.slug))

const { data: shell } = await useFetch<StorefrontPayload>(
  () => `/api/storefront/${slug.value}/page`,
  { query: { path: '/' } },
)

const cart = useCart(slug.value)
await cart.refresh()

const currency = computed(() => shell.value?.store.settings.currency ?? 'USD')

const form = reactive({
  email: '',
  name: '',
  address1: '',
  address2: '',
  city: '',
  region: '',
  postal: '',
  country: 'United States',
})

const submitting = ref(false)
const error = ref<string | null>(null)

async function placeOrder() {
  submitting.value = true
  error.value = null
  try {
    const result = await $fetch<{ orderId: string }>(`/api/storefront/${slug.value}/checkout`, {
      method: 'POST',
      body: { ...form },
    })
    await cart.refresh()
    await router.push(`/s/${slug.value}/order/${result.orderId}`)
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Could not place your order'
    submitting.value = false
  }
}

useHead(() => ({ title: `Checkout — ${shell.value?.store.name ?? 'Store'}` }))
</script>

<template>
  <StorefrontShell
    v-if="shell"
    :slug="slug"
    :store-name="shell.store.name"
    :brand="shell.store.brand"
    :theme="shell.store.theme"
    :settings="shell.store.settings"
  >
    <div class="st-wrap">
      <div v-if="!cart.cart.value?.lines.length" class="st-empty-state">
        <h2>Your cart is empty</h2>
        <p>Add something before checking out.</p>
        <NuxtLink class="st-btn" :to="`/s/${slug}`">Continue shopping</NuxtLink>
      </div>

      <div v-else class="st-checkout">
        <form @submit.prevent="placeOrder">
          <h1 style="font-size: 28px; margin-bottom: 26px;">Checkout</h1>

          <div v-if="error" class="st-note" style="color: #b91c1c; border-color: #b91c1c; margin-bottom: 18px;">
            {{ error }}
          </div>

          <h2 style="font-size: 16px; margin-bottom: 14px;">Contact</h2>
          <div class="st-field">
            <label for="email">Email</label>
            <input id="email" v-model="form.email" type="email" required autocomplete="email">
          </div>

          <h2 style="font-size: 16px; margin: 28px 0 14px;">Shipping address</h2>
          <div class="st-field">
            <label for="name">Full name</label>
            <input id="name" v-model="form.name" required autocomplete="name">
          </div>
          <div class="st-field">
            <label for="address1">Address</label>
            <input id="address1" v-model="form.address1" required autocomplete="address-line1">
          </div>
          <div class="st-field">
            <label for="address2">Apartment, suite (optional)</label>
            <input id="address2" v-model="form.address2" autocomplete="address-line2">
          </div>
          <div class="st-form__row">
            <div class="st-field">
              <label for="city">City</label>
              <input id="city" v-model="form.city" required autocomplete="address-level2">
            </div>
            <div class="st-field">
              <label for="region">State / region</label>
              <input id="region" v-model="form.region" autocomplete="address-level1">
            </div>
          </div>
          <div class="st-form__row">
            <div class="st-field">
              <label for="postal">Postal code</label>
              <input id="postal" v-model="form.postal" required autocomplete="postal-code">
            </div>
            <div class="st-field">
              <label for="country">Country</label>
              <input id="country" v-model="form.country" required autocomplete="country-name">
            </div>
          </div>

          <div class="st-note" style="margin: 22px 0;">
            <strong>Test checkout.</strong> This store runs a simulated payment gateway, so no card
            details are requested and no money moves. The order is recorded exactly as a real one would be.
          </div>

          <button class="st-btn st-btn--block" type="submit" :disabled="submitting">
            {{ submitting ? 'Placing order…' : `Pay ${formatMoney(cart.cart.value.totals.totalCents, currency)}` }}
          </button>
        </form>

        <aside class="st-summary">
          <h2>Order summary</h2>
          <div
            v-for="line in cart.cart.value.lines"
            :key="`${line.productId}:${line.variantId ?? ''}`"
            style="display: flex; gap: 12px; margin-bottom: 16px; align-items: center;"
          >
            <img
              :src="line.image ?? ''"
              :alt="line.title"
              style="width: 52px; height: 52px; object-fit: cover; border-radius: var(--st-radius);"
            >
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 14px; font-weight: 550;">{{ line.title }}</div>
              <div style="font-size: 13px; color: var(--st-muted);">
                <template v-if="line.variantTitle">{{ line.variantTitle }} · </template>
                Qty {{ line.quantity }}
              </div>
            </div>
            <strong style="font-size: 14px;">
              {{ formatMoney(line.unitPriceCents * line.quantity, currency) }}
            </strong>
          </div>

          <div style="border-top: 1px solid var(--st-border); margin-top: 20px; padding-top: 8px;">
            <div class="st-totals__row">
              <span>Subtotal</span>
              <span>{{ formatMoney(cart.cart.value.totals.subtotalCents, currency) }}</span>
            </div>
            <div class="st-totals__row">
              <span>Shipping</span>
              <span>
                {{ cart.cart.value.totals.shippingCents === 0
                  ? 'Free'
                  : formatMoney(cart.cart.value.totals.shippingCents, currency) }}
              </span>
            </div>
            <div v-if="cart.cart.value.totals.taxCents > 0" class="st-totals__row">
              <span>Tax</span>
              <span>{{ formatMoney(cart.cart.value.totals.taxCents, currency) }}</span>
            </div>
            <div class="st-totals__row st-totals__row--grand">
              <span>Total</span>
              <span>{{ formatMoney(cart.cart.value.totals.totalCents, currency) }}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </StorefrontShell>
</template>
