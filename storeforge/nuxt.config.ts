import { fileURLToPath } from 'node:url'

const sharedDir = fileURLToPath(new URL('./shared', import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Opt into the v4 directory layout: app/ for the Vue app, server/ for Nitro,
  // shared/ for code both sides import.
  future: { compatibilityVersion: 4 },

  devtools: { enabled: false },
  css: ['~/assets/css/main.css', '~/assets/css/storefront.css'],

  // `#shared` is resolved for the Vue app, for Nitro, and for vue-tsc.
  alias: { '#shared': sharedDir },

  imports: {
    dirs: ['composables', 'utils'],
  },

  /**
   * Defaults here are for local development only. Every value is overridable at
   * runtime via its NUXT_-prefixed environment variable, and `server/config.ts`
   * validates the resolved set at boot so a missing secret fails immediately
   * rather than at the first request that needs it.
   */
  runtimeConfig: {
    databaseUrl: '',
    sessionSecret: '',
    anthropicApiKey: '',
    anthropicModel: 'claude-opus-5',
    resendApiKey: '',
    emailFrom: 'StoreForge <noreply@storeforge.app>',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePriceProMonthly: '',
    stripePriceBusinessMonthly: '',
    sentryDsn: '',
    public: {
      appName: 'StoreForge',
      appUrl: 'http://localhost:3000',
    },
  },

  nitro: {
    experimental: { asyncContext: true },
    alias: { '#shared': sharedDir },
  },

  typescript: { strict: true },

  app: {
    head: {
      title: 'StoreForge — AI store builder',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Describe your store. Watch it build itself.' },
      ],
    },
  },
})
