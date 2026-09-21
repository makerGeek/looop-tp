<script setup lang="ts">
import type { Brand, StoreSettings, Theme } from '#shared/types'

const props = defineProps<{
  slug: string
  storeName: string
  brand: Brand
  theme: Theme
  settings: StoreSettings
  nav?: Array<{ label: string, href: string }>
  isDraft?: boolean
}>()

const cart = useCart(props.slug)
const route = useRoute()

onMounted(() => cart.refresh())

const style = computed(() => themeVars(props.theme))
</script>

<template>
  <div
    class="st-root"
    :style="style"
    :data-density="theme.density"
    :data-buttons="theme.buttonStyle"
  >
    <div v-if="isDraft" class="st-preview-flag">
      Draft preview — only you can see this. Publish it to share the link.
    </div>
    <div v-if="brand.announcement" class="st-announce">{{ brand.announcement }}</div>

    <header class="st-header">
      <div class="st-wrap st-header__inner">
        <NuxtLink class="st-brand" :to="`/s/${slug}`">
          {{ brand.logoText || storeName }}
        </NuxtLink>

        <nav v-if="nav?.length" class="st-nav">
          <NuxtLink
            v-for="item in nav"
            :key="item.href"
            :to="storeHref(slug, item.href)"
            :class="{ 'is-active': route.path === storeHref(slug, item.href) }"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="st-header__spacer" />

        <NuxtLink class="st-cartlink" :to="`/s/${slug}/cart`">
          Cart
          <span v-if="cart.count.value" class="st-cartlink__count">{{ cart.count.value }}</span>
        </NuxtLink>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="st-footer">
      <div class="st-wrap">
        <div class="st-footer__cols">
          <div>
            <div class="st-brand" style="margin-bottom: 8px;">{{ brand.logoText || storeName }}</div>
            <p v-if="brand.tagline" style="margin: 0; color: var(--st-muted); max-width: 34ch;">
              {{ brand.tagline }}
            </p>
          </div>
          <div class="st-footer__links">
            <NuxtLink v-for="link in settings.footerLinks" :key="link.href" :to="storeHref(slug, link.href)">
              {{ link.label }}
            </NuxtLink>
            <a v-for="link in settings.socialLinks" :key="link.href" :href="link.href" rel="noopener noreferrer" target="_blank">
              {{ link.label }}
            </a>
          </div>
        </div>
        <div class="st-footer__legal">
          © {{ new Date().getFullYear() }} {{ storeName }}.
          <template v-if="settings.supportEmail"> · {{ settings.supportEmail }}</template>
          · Built with StoreForge
        </div>
      </div>
    </footer>
  </div>
</template>
