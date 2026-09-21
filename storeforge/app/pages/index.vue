<script setup lang="ts">
const { user } = useAuth()

useHead({ title: 'StoreForge — describe your store, watch it build itself' })

const features = [
  {
    icon: '💬',
    title: 'Build by describing it',
    body: 'Say "a cold-brew roaster with a subscription and an about page" and get a themed storefront with real products and real copy — not a blank template.',
  },
  {
    icon: '🛒',
    title: 'A real store, not a mockup',
    body: 'Cart, variants, inventory, shipping rules, tax, checkout and orders all work from the first generation. The preview is the actual storefront.',
  },
  {
    icon: '🎨',
    title: 'Designed to the niche',
    body: 'Palette, type and spacing are chosen for what you sell. A skincare brand and a barbell supplier come out looking nothing alike.',
  },
  {
    icon: '✏️',
    title: 'Keep talking to change it',
    body: '"Make the hero darker", "add an FAQ", "drop the prices 10%". Every edit is a message, and the store updates while you watch.',
  },
  {
    icon: '📦',
    title: 'Admin that comes with it',
    body: 'Products, orders and settings get a proper dashboard. Fulfil an order, edit a price, publish when you are ready.',
  },
  {
    icon: '🔒',
    title: 'Structured, not improvised',
    body: 'The model edits a validated store document rather than writing raw code, so a bad generation is never a broken site.',
  },
]
</script>

<template>
  <div>
    <section class="sf-hero">
      <h1>
        Describe your store.<br>
        <span class="sf-hero__grad">Watch it build itself.</span>
      </h1>
      <p>
        StoreForge is an AI store builder that produces a working ecommerce site — theme, pages,
        catalogue, cart and checkout — from a sentence. Then you keep editing by talking to it.
      </p>
      <div class="sf-hero__cta">
        <NuxtLink class="sf-btn sf-btn--lg" :to="user ? '/dashboard' : '/signup'">
          {{ user ? 'Go to your stores' : 'Build a store free' }}
        </NuxtLink>
        <NuxtLink class="sf-btn sf-btn--ghost sf-btn--lg" to="/login">
          Sign in
        </NuxtLink>
      </div>
    </section>

    <section class="sf-features">
      <div class="sf-grid sf-grid--3">
        <div v-for="feature in features" :key="feature.title" class="sf-card sf-feature">
          <div class="sf-feature__icon">{{ feature.icon }}</div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.body }}</p>
        </div>
      </div>

      <div class="sf-card" style="margin-top: 40px;">
        <h3 style="margin: 0 0 18px; font-size: 16px;">How it goes</h3>
        <div class="sf-steps">
          <div class="sf-step">
            <div class="sf-step__n" />
            <div>
              <strong>Describe it.</strong>
              <span class="sf-muted"> "A ceramics shop selling hand-thrown mugs, warm and minimal."</span>
            </div>
          </div>
          <div class="sf-step">
            <div class="sf-step__n" />
            <div>
              <strong>Watch it build.</strong>
              <span class="sf-muted"> Theme, home page, catalogue, about page and products appear step by step.</span>
            </div>
          </div>
          <div class="sf-step">
            <div class="sf-step__n" />
            <div>
              <strong>Refine by talking.</strong>
              <span class="sf-muted"> Ask for changes until it is right. Test the checkout yourself.</span>
            </div>
          </div>
          <div class="sf-step">
            <div class="sf-step__n" />
            <div>
              <strong>Publish.</strong>
              <span class="sf-muted"> Your storefront goes live at its own URL and starts taking orders.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
