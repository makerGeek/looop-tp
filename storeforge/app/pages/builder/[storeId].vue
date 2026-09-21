<script setup lang="ts">
import type { ChatMessageRecord, PageRecord, ProductRecord, StoreRecord } from '#shared/types'

definePageMeta({ middleware: 'auth', layout: 'default' })

const route = useRoute()
const storeId = String(route.params.storeId)

const { data, refresh } = await useFetch<{
  store: StoreRecord
  pages: PageRecord[]
  products: ProductRecord[]
  messages: ChatMessageRecord[]
  aiConfigured: boolean
}>(`/api/stores/${storeId}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Store not found', fatal: true })
}

const builder = useBuilder(storeId, data.value.messages)

const draft = ref('')
const previewPath = ref('/')
const logEl = ref<HTMLElement | null>(null)
const frameKey = ref(0)

const store = computed(() => data.value!.store)
const isEmpty = computed(() => !data.value!.pages.length && !data.value!.products.length)

const previewSrc = computed(() => {
  const base = `/s/${store.value.slug}`
  const path = previewPath.value === '/' ? base : `${base}${previewPath.value}`
  return `${path}?preview=${frameKey.value}`
})

const previewTargets = computed(() => {
  const paths = data.value!.pages.map(p => ({ label: p.navLabel || p.title, path: p.path }))
  return paths.length ? paths : [{ label: 'Home', path: '/' }]
})

const suggestions = [
  'Build a cold-brew coffee roaster with a subscription product',
  'A minimal skincare brand with six products and an FAQ',
  'A plant shop sorted by how much light each plant needs',
  'A streetwear label with a lookbook page',
]

/** After each turn the store changed underneath us — reload data and the frame. */
watch(builder.revision, async () => {
  await refresh()
  frameKey.value++
})

watch(
  () => [builder.transcript.value.length, builder.transcript.value.at(-1)?.actions.length, builder.thinking.value],
  async () => {
    await nextTick()
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  },
)

onMounted(async () => {
  await nextTick()
  if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
})

async function submit() {
  const message = draft.value
  draft.value = ''
  await builder.send(message)
}

function useSuggestion(text: string) {
  draft.value = text
}

async function togglePublish() {
  const next = store.value.status === 'published' ? 'draft' : 'published'
  await $fetch(`/api/stores/${storeId}`, { method: 'PATCH', body: { status: next } })
  await refresh()
  frameKey.value++
}

useHead(() => ({ title: `${store.value.name} — Builder` }))
</script>

<template>
  <div class="sf-builder">
    <!-- Conversation -->
    <section class="sf-chat">
      <div ref="logEl" class="sf-chat__log">
        <div v-if="isEmpty && !builder.transcript.value.length" class="sf-card">
          <h3 style="margin: 0 0 8px; font-size: 15.5px;">Describe the store you want</h3>
          <p class="sf-muted" style="margin: 0 0 14px; font-size: 14px; line-height: 1.6;">
            Be as specific as you like — what you sell, the mood, how many products.
            You'll get a themed storefront with a real catalogue you can immediately buy from.
          </p>
          <div v-if="!data!.aiConfigured" class="sf-alert sf-alert--info" style="margin: 0;">
            No <span class="sf-mono">ANTHROPIC_API_KEY</span> is set, so the local template planner
            will handle this. It builds a complete, real store from the closest matching niche —
            add a key and restart for generation that follows your description exactly.
          </div>
        </div>

        <div
          v-for="entry in builder.transcript.value"
          :key="entry.id"
          class="sf-msg sf-enter"
          :class="entry.role === 'user' ? 'sf-msg--user' : 'sf-msg--assistant'"
        >
          <div v-if="entry.actions.length" class="sf-actions">
            <div v-for="(action, i) in entry.actions" :key="i" class="sf-action">
              <span class="sf-action__tick">✓</span>
              <div class="sf-action__body">
                <div class="sf-action__summary">{{ action.summary }}</div>
                <div v-if="action.detail" class="sf-action__detail">{{ action.detail }}</div>
              </div>
            </div>
          </div>

          <div v-if="entry.content" class="sf-msg__bubble">{{ entry.content }}</div>

          <div v-else-if="entry.streaming && !entry.actions.length" class="sf-thinking">
            Working…
          </div>
        </div>

        <div v-if="builder.thinking.value" class="sf-thinking sf-enter">
          {{ builder.thinking.value }}
        </div>
      </div>

      <div class="sf-chat__form">
        <div v-if="builder.error.value" class="sf-alert sf-alert--error">
          {{ builder.error.value }}
        </div>

        <div v-if="!builder.transcript.value.length" class="sf-suggest">
          <button
            v-for="s in suggestions"
            :key="s"
            :disabled="builder.running.value"
            @click="useSuggestion(s)"
          >
            {{ s }}
          </button>
        </div>

        <form @submit.prevent="submit">
          <textarea
            v-model="draft"
            class="sf-textarea"
            rows="3"
            :placeholder="isEmpty ? 'A ceramics shop selling hand-thrown mugs, warm and minimal…' : 'Make the hero darker, add an FAQ page…'"
            :disabled="builder.running.value"
            @keydown.enter.exact.prevent="submit"
          />
          <div style="display: flex; gap: 8px; margin-top: 10px; align-items: center;">
            <button class="sf-btn" type="submit" :disabled="builder.running.value || !draft.trim()">
              <span v-if="builder.running.value" class="sf-spin" />
              {{ builder.running.value ? 'Building…' : 'Send' }}
            </button>
            <span class="sf-faint" style="font-size: 12px;">Enter to send · Shift+Enter for a new line</span>
          </div>
        </form>
      </div>
    </section>

    <!-- Live preview -->
    <section class="sf-preview">
      <div class="sf-preview__bar">
        <div class="sf-seg">
          <button
            v-for="target in previewTargets"
            :key="target.path"
            :class="{ 'is-active': previewPath === target.path }"
            @click="previewPath = target.path"
          >
            {{ target.label }}
          </button>
        </div>

        <div class="sf-preview__url">/s/{{ store.slug }}{{ previewPath === '/' ? '' : previewPath }}</div>

        <span class="sf-badge" :class="store.status === 'published' ? 'sf-badge--live' : 'sf-badge--draft'">
          {{ store.status === 'published' ? 'Live' : 'Draft' }}
        </span>

        <button class="sf-btn sf-btn--ghost sf-btn--sm" @click="frameKey++">Reload</button>
        <button class="sf-btn sf-btn--sm" @click="togglePublish">
          {{ store.status === 'published' ? 'Unpublish' : 'Publish' }}
        </button>
        <NuxtLink class="sf-btn sf-btn--ghost sf-btn--sm" :to="`/admin/${storeId}`">Admin</NuxtLink>
      </div>

      <iframe
        v-if="!isEmpty"
        :key="frameKey"
        class="sf-preview__frame"
        :src="previewSrc"
        title="Storefront preview"
      />
      <div v-else class="sf-empty" style="flex: 1; display: grid; place-items: center;">
        <div>
          <h3>Your storefront will appear here</h3>
          <p>Send a message to start building.</p>
        </div>
      </div>
    </section>
  </div>
</template>
