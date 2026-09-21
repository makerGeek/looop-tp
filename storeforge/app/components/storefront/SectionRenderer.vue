<script setup lang="ts">
import type { ProductRecord, Section } from '#shared/types'

/**
 * Renders one AI-authored section.
 *
 * Every branch has to tolerate partial data — the model can omit any optional
 * field, and a section that renders half-empty is much better than one that
 * throws and takes the whole storefront down with it.
 */
const props = defineProps<{
  section: Section
  products: ProductRecord[]
  slug: string
  currency: string
}>()

/** Resolves which products a `featured_products` section should show. */
const selected = computed<ProductRecord[]>(() => {
  if (props.section.type !== 'featured_products') return []
  const s = props.section

  if (s.handles?.length) {
    // Preserve the order the model asked for, dropping handles that don't exist.
    return s.handles
      .map(h => props.products.find(p => p.handle === h))
      .filter((p): p is ProductRecord => !!p)
      .slice(0, s.limit ?? 12)
  }

  const pool = s.collection
    ? props.products.filter(p => p.collection === s.collection)
    : props.products

  return pool.slice(0, s.limit ?? 8)
})

const galleryImages = computed(() => {
  if (props.section.type !== 'gallery') return []
  return props.section.images.map((img, i) =>
    /^(https?:|\/)/.test(img)
      ? img
      : `/img/art?seed=${encodeURIComponent(`${props.slug}:gallery:${i}`)}&label=${encodeURIComponent(img)}`,
  )
})
</script>

<template>
  <!-- Hero -->
  <section
    v-if="section.type === 'hero'"
    class="st-hero"
    :class="`st-hero--${section.layout ?? 'split'}`"
  >
    <div class="st-wrap">
      <div class="st-hero__grid">
        <div class="st-hero__copy">
          <div v-if="section.eyebrow" class="st-hero__eyebrow">{{ section.eyebrow }}</div>
          <h1>{{ section.heading }}</h1>
          <p v-if="section.subheading">{{ section.subheading }}</p>
          <div class="st-hero__cta">
            <NuxtLink
              v-if="section.ctaLabel"
              class="st-btn"
              :to="storeHref(slug, section.ctaHref)"
            >
              {{ section.ctaLabel }}
            </NuxtLink>
            <NuxtLink
              v-if="section.secondaryCtaLabel"
              class="st-btn st-btn--outline"
              :to="storeHref(slug, section.secondaryCtaHref)"
            >
              {{ section.secondaryCtaLabel }}
            </NuxtLink>
          </div>
        </div>
        <img
          v-if="section.layout !== 'minimal' && section.layout !== 'center'"
          class="st-hero__art"
          :src="section.image || `/img/art?seed=${encodeURIComponent(slug)}&variant=scene&label=${encodeURIComponent(section.heading)}`"
          :alt="section.heading"
        >
      </div>
    </div>
  </section>

  <!-- Product grid -->
  <section v-else-if="section.type === 'featured_products'" class="st-section">
    <div class="st-wrap">
      <div v-if="section.heading" class="st-section__head">
        <h2>{{ section.heading }}</h2>
        <p v-if="section.subheading">{{ section.subheading }}</p>
      </div>
      <div v-if="selected.length" class="st-products" :data-cols="section.columns ?? 3">
        <StorefrontProductCard
          v-for="product in selected"
          :key="product.id"
          :product="product"
          :slug="slug"
          :currency="currency"
        />
      </div>
      <p v-else class="st-prose">No products here yet.</p>
    </div>
  </section>

  <!-- Prose -->
  <section v-else-if="section.type === 'rich_text'" class="st-section">
    <div class="st-wrap">
      <div class="st-prose" :class="{ 'st-prose--center': section.align === 'center' }">
        <h2 v-if="section.heading">{{ section.heading }}</h2>
        <p v-for="(para, i) in section.body.split(/\n{2,}/)" :key="i">{{ para }}</p>
      </div>
    </div>
  </section>

  <!-- Value props -->
  <section v-else-if="section.type === 'feature_grid'" class="st-section st-section--surface">
    <div class="st-wrap">
      <div v-if="section.heading" class="st-section__head st-section__head--center">
        <h2>{{ section.heading }}</h2>
        <p v-if="section.subheading">{{ section.subheading }}</p>
      </div>
      <div class="st-features">
        <div v-for="(item, i) in section.items" :key="i" class="st-feature">
          <div v-if="item.icon" class="st-feature__icon">{{ item.icon }}</div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.body }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Social proof -->
  <section v-else-if="section.type === 'testimonials'" class="st-section st-section--surface">
    <div class="st-wrap">
      <div v-if="section.heading" class="st-section__head st-section__head--center">
        <h2>{{ section.heading }}</h2>
      </div>
      <div class="st-quotes">
        <blockquote v-for="(item, i) in section.items" :key="i" class="st-quote">
          <p>“{{ item.quote }}”</p>
          <footer>
            <strong>{{ item.author }}</strong>
            <span v-if="item.role">{{ item.role }}</span>
          </footer>
        </blockquote>
      </div>
    </div>
  </section>

  <!-- Gallery -->
  <section v-else-if="section.type === 'gallery'" class="st-section">
    <div class="st-wrap">
      <div v-if="section.heading" class="st-section__head st-section__head--center">
        <h2>{{ section.heading }}</h2>
      </div>
      <div class="st-gallery">
        <img v-for="(src, i) in galleryImages" :key="i" :src="src" :alt="section.images[i]" loading="lazy">
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section v-else-if="section.type === 'faq'" class="st-section">
    <div class="st-wrap">
      <div v-if="section.heading" class="st-section__head">
        <h2>{{ section.heading }}</h2>
      </div>
      <div class="st-faq">
        <details v-for="(item, i) in section.items" :key="i" :open="i === 0">
          <summary>{{ item.question }}</summary>
          <p>{{ item.answer }}</p>
        </details>
      </div>
    </div>
  </section>

  <!-- CTA banner -->
  <section v-else-if="section.type === 'cta_banner'" class="st-section st-section--tight">
    <div class="st-wrap">
      <div class="st-banner">
        <h2>{{ section.heading }}</h2>
        <p v-if="section.body">{{ section.body }}</p>
        <NuxtLink v-if="section.ctaLabel" class="st-btn" :to="storeHref(slug, section.ctaHref)">
          {{ section.ctaLabel }}
        </NuxtLink>
      </div>
    </div>
  </section>

  <!-- Newsletter -->
  <section v-else-if="section.type === 'newsletter'" class="st-section st-section--surface">
    <div class="st-wrap">
      <div class="st-newsletter">
        <h2>{{ section.heading }}</h2>
        <p v-if="section.body">{{ section.body }}</p>
        <StorefrontNewsletterForm :button-label="section.buttonLabel ?? 'Subscribe'" />
      </div>
    </div>
  </section>

  <!-- Logo cloud -->
  <section v-else-if="section.type === 'logo_cloud'" class="st-section st-section--tight">
    <div class="st-wrap">
      <div v-if="section.heading" class="st-section__head st-section__head--center">
        <h2>{{ section.heading }}</h2>
      </div>
      <div class="st-logos">
        <span v-for="(name, i) in section.items" :key="i">{{ name }}</span>
      </div>
    </div>
  </section>
</template>
