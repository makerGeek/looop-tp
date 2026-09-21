<script setup lang="ts">
import type { OrderRecord, OrderStatus, PageRecord, ProductRecord, StoreRecord } from '#shared/types'
import { formatMoney } from '#shared/money'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const storeId = String(route.params.storeId)

const { data, refresh } = await useFetch<{
  store: StoreRecord
  pages: PageRecord[]
  products: ProductRecord[]
}>(`/api/stores/${storeId}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Store not found', fatal: true })
}

const { data: orders, refresh: refreshOrders } = await useFetch<OrderRecord[]>(
  `/api/stores/${storeId}/orders`,
)

const tab = ref<'products' | 'orders' | 'settings'>('products')
const store = computed(() => data.value!.store)
const currency = computed(() => store.value.settings.currency)

const revenue = computed(() =>
  (orders.value ?? [])
    .filter(o => o.status !== 'refunded' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totals.totalCents, 0),
)

/* ------------------------------------------------------------- products */

const editing = ref<ProductRecord | null>(null)
const form = reactive({ handle: '', title: '', description: '', price: '', compareAtPrice: '', inventory: 100, collection: '' })
const saving = ref(false)
const formError = ref<string | null>(null)

function startEdit(product: ProductRecord | null) {
  editing.value = product
  formError.value = null
  Object.assign(form, {
    handle: product?.handle ?? '',
    title: product?.title ?? '',
    description: product?.description ?? '',
    price: product ? (product.priceCents / 100).toFixed(2) : '',
    compareAtPrice: product?.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : '',
    inventory: product?.inventory ?? 100,
    collection: product?.collection ?? '',
  })
}

async function saveProduct() {
  saving.value = true
  formError.value = null
  try {
    await $fetch(`/api/stores/${storeId}/products`, {
      method: 'PUT',
      body: {
        handle: form.handle || undefined,
        title: form.title,
        description: form.description,
        price: form.price,
        compareAtPrice: form.compareAtPrice || null,
        inventory: Number(form.inventory),
        collection: form.collection || null,
      },
    })
    editing.value = null
    await refresh()
  }
  catch (err: any) {
    formError.value = err?.data?.statusMessage ?? 'Could not save the product'
  }
  finally {
    saving.value = false
  }
}

async function removeProduct(product: ProductRecord) {
  if (!confirm(`Delete "${product.title}"?`)) return
  await $fetch(`/api/stores/${storeId}/products`, { method: 'DELETE', body: { handle: product.handle } })
  await refresh()
}

/* --------------------------------------------------------------- orders */

const STATUSES: OrderStatus[] = ['paid', 'fulfilled', 'refunded', 'cancelled']

async function setStatus(order: OrderRecord, status: OrderStatus) {
  await $fetch(`/api/stores/${storeId}/orders`, { method: 'PATCH', body: { orderId: order.id, status } })
  await refreshOrders()
}

/* ------------------------------------------------------------- settings */

const settings = reactive({
  name: store.value.name,
  currency: store.value.settings.currency,
  shippingFlat: (store.value.settings.shippingFlatCents / 100).toFixed(2),
  freeShippingThreshold: store.value.settings.freeShippingThresholdCents
    ? (store.value.settings.freeShippingThresholdCents / 100).toFixed(2)
    : '',
  taxRatePercent: store.value.settings.taxRateBps / 100,
  supportEmail: store.value.settings.supportEmail ?? '',
  announcement: store.value.brand.announcement ?? '',
  tagline: store.value.brand.tagline ?? '',
})
const savingSettings = ref(false)
const settingsSaved = ref(false)

async function saveSettings() {
  savingSettings.value = true
  settingsSaved.value = false
  const threshold = Math.round(Number.parseFloat(settings.freeShippingThreshold || '0') * 100)

  await $fetch(`/api/stores/${storeId}`, {
    method: 'PATCH',
    body: {
      name: settings.name,
      brand: { ...store.value.brand, name: settings.name, tagline: settings.tagline, announcement: settings.announcement },
      settings: {
        ...store.value.settings,
        currency: settings.currency.toUpperCase().slice(0, 3),
        shippingFlatCents: Math.round(Number.parseFloat(settings.shippingFlat || '0') * 100),
        freeShippingThresholdCents: threshold > 0 ? threshold : null,
        taxRateBps: Math.round(Number(settings.taxRatePercent) * 100),
        supportEmail: settings.supportEmail || undefined,
      },
    },
  })
  await refresh()
  savingSettings.value = false
  settingsSaved.value = true
  setTimeout(() => { settingsSaved.value = false }, 2500)
}

async function togglePublish() {
  await $fetch(`/api/stores/${storeId}`, {
    method: 'PATCH',
    body: { status: store.value.status === 'published' ? 'draft' : 'published' },
  })
  await refresh()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

useHead(() => ({ title: `${store.value.name} — Admin` }))
</script>

<template>
  <div class="sf-page sf-page--wide">
    <div class="sf-page__head">
      <div>
        <h1>{{ store.name }}</h1>
        <p>
          <span class="sf-mono">/s/{{ store.slug }}</span>
          · {{ data!.products.length }} products
          · {{ orders?.length ?? 0 }} orders
          · {{ formatMoney(revenue, currency) }} revenue
        </p>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <NuxtLink class="sf-btn sf-btn--ghost sf-btn--sm" :to="`/builder/${storeId}`">Builder</NuxtLink>
        <a class="sf-btn sf-btn--ghost sf-btn--sm" :href="`/s/${store.slug}`" target="_blank" rel="noopener">View ↗</a>
        <button class="sf-btn sf-btn--sm" @click="togglePublish">
          {{ store.status === 'published' ? 'Unpublish' : 'Publish' }}
        </button>
      </div>
    </div>

    <div class="sf-seg" style="margin-bottom: 22px;">
      <button :class="{ 'is-active': tab === 'products' }" @click="tab = 'products'">Products</button>
      <button :class="{ 'is-active': tab === 'orders' }" @click="tab = 'orders'">Orders</button>
      <button :class="{ 'is-active': tab === 'settings' }" @click="tab = 'settings'">Settings</button>
    </div>

    <!-- Products -->
    <div v-if="tab === 'products'">
      <div style="display: flex; justify-content: flex-end; margin-bottom: 14px;">
        <button class="sf-btn sf-btn--sm" @click="startEdit(null)">+ Add product</button>
      </div>

      <div v-if="editing !== null || form.title || formError" class="sf-card sf-enter" style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 16px; font-size: 15.5px;">
          {{ editing ? `Edit ${editing.title}` : 'New product' }}
        </h3>
        <form @submit.prevent="saveProduct">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="sf-field">
              <label class="sf-label">Title</label>
              <input v-model="form.title" class="sf-input" required>
            </div>
            <div class="sf-field">
              <label class="sf-label">Collection</label>
              <input v-model="form.collection" class="sf-input" placeholder="Bestsellers">
            </div>
            <div class="sf-field">
              <label class="sf-label">Price</label>
              <input v-model="form.price" class="sf-input" required placeholder="24.00">
            </div>
            <div class="sf-field">
              <label class="sf-label">Compare-at price</label>
              <input v-model="form.compareAtPrice" class="sf-input" placeholder="Optional">
            </div>
            <div class="sf-field">
              <label class="sf-label">Inventory</label>
              <input v-model.number="form.inventory" class="sf-input" type="number" min="0">
            </div>
          </div>
          <div class="sf-field">
            <label class="sf-label">Description</label>
            <textarea v-model="form.description" class="sf-textarea" />
          </div>
          <div v-if="formError" class="sf-alert sf-alert--error">{{ formError }}</div>
          <div style="display: flex; gap: 8px;">
            <button class="sf-btn sf-btn--sm" type="submit" :disabled="saving">
              {{ saving ? 'Saving…' : 'Save product' }}
            </button>
            <button class="sf-btn sf-btn--ghost sf-btn--sm" type="button" @click="editing = null; form.title = ''; formError = null">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div v-if="!data!.products.length" class="sf-card sf-empty">
        <h3>No products yet</h3>
        <p>Ask the builder for some, or add one by hand.</p>
      </div>

      <div v-else class="sf-card" style="padding: 0; overflow-x: auto;">
        <table class="sf-table">
          <thead>
            <tr>
              <th style="width: 48px;" />
              <th>Product</th>
              <th>Collection</th>
              <th>Price</th>
              <th>Stock</th>
              <th style="width: 150px;" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in data!.products" :key="product.id">
              <td>
                <img
                  :src="product.image ?? ''" :alt="product.title"
                  style="width: 36px; height: 36px; border-radius: 7px; object-fit: cover; display: block;"
                >
              </td>
              <td>
                <div style="font-weight: 550;">{{ product.title }}</div>
                <div class="sf-faint sf-mono" style="font-size: 12px;">{{ product.handle }}</div>
              </td>
              <td class="sf-muted">{{ product.collection ?? '—' }}</td>
              <td>
                {{ formatMoney(product.priceCents, currency) }}
                <span v-if="product.compareAtCents" class="sf-faint" style="text-decoration: line-through; font-size: 12.5px;">
                  {{ formatMoney(product.compareAtCents, currency) }}
                </span>
              </td>
              <td :class="product.inventory === 0 ? 'sf-muted' : ''">
                {{ product.inventory === 0 ? 'Sold out' : product.inventory }}
              </td>
              <td>
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                  <button class="sf-btn sf-btn--ghost sf-btn--sm" @click="startEdit(product)">Edit</button>
                  <button class="sf-btn sf-btn--danger sf-btn--sm" @click="removeProduct(product)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Orders -->
    <div v-else-if="tab === 'orders'">
      <div v-if="!orders?.length" class="sf-card sf-empty">
        <h3>No orders yet</h3>
        <p>Open your storefront and place a test order — checkout is fully wired up.</p>
      </div>

      <div v-else class="sf-card" style="padding: 0; overflow-x: auto;">
        <table class="sf-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Placed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td class="sf-mono">#{{ order.number }}</td>
              <td>
                <div>{{ order.shipping.name }}</div>
                <div class="sf-faint" style="font-size: 12.5px;">{{ order.email }}</div>
              </td>
              <td class="sf-muted">
                {{ order.lines.reduce((n, l) => n + l.quantity, 0) }} item(s)
                <div class="sf-faint" style="font-size: 12.5px;">
                  {{ order.lines.map(l => l.title).slice(0, 2).join(', ') }}
                  <template v-if="order.lines.length > 2">, +{{ order.lines.length - 2 }}</template>
                </div>
              </td>
              <td><strong>{{ formatMoney(order.totals.totalCents, order.currency) }}</strong></td>
              <td class="sf-muted" style="font-size: 13px;">{{ formatDate(order.createdAt) }}</td>
              <td>
                <select
                  class="sf-select"
                  style="width: auto; padding: 5px 9px; font-size: 13px;"
                  :value="order.status"
                  @change="setStatus(order, ($event.target as HTMLSelectElement).value as OrderStatus)"
                >
                  <option v-for="status in STATUSES" :key="status" :value="status">
                    {{ status }}
                  </option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Settings -->
    <div v-else class="sf-card" style="max-width: 640px;">
      <form @submit.prevent="saveSettings">
        <div class="sf-field">
          <label class="sf-label">Store name</label>
          <input v-model="settings.name" class="sf-input" required>
        </div>
        <div class="sf-field">
          <label class="sf-label">Tagline</label>
          <input v-model="settings.tagline" class="sf-input">
        </div>
        <div class="sf-field">
          <label class="sf-label">Announcement bar</label>
          <input v-model="settings.announcement" class="sf-input" placeholder="Free shipping over $75">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="sf-field">
            <label class="sf-label">Currency</label>
            <input v-model="settings.currency" class="sf-input" maxlength="3">
          </div>
          <div class="sf-field">
            <label class="sf-label">Support email</label>
            <input v-model="settings.supportEmail" class="sf-input" type="email">
          </div>
          <div class="sf-field">
            <label class="sf-label">Flat shipping</label>
            <input v-model="settings.shippingFlat" class="sf-input">
          </div>
          <div class="sf-field">
            <label class="sf-label">Free shipping over</label>
            <input v-model="settings.freeShippingThreshold" class="sf-input" placeholder="Blank to disable">
          </div>
          <div class="sf-field">
            <label class="sf-label">Tax rate (%)</label>
            <input v-model.number="settings.taxRatePercent" class="sf-input" type="number" step="0.1" min="0">
          </div>
        </div>

        <button class="sf-btn" type="submit" :disabled="savingSettings">
          {{ savingSettings ? 'Saving…' : settingsSaved ? 'Saved ✓' : 'Save settings' }}
        </button>
      </form>
    </div>
  </div>
</template>
