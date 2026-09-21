import { fileURLToPath } from 'node:url'
const sharedDir = fileURLToPath(new URL('./shared', import.meta.url))
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  // Opt into the v4 directory layout: app/ for the Vue app, server/ for Nitro,
  // shared/ for code both sides import.
  future: { compatibilityVersion: 4 },
  devtools: { enabled: false },
  css: ['~/assets/css/main.css', '~/assets/css/storefront.css'],
  // `#shared` is resolved for the Vue app, for Nitro, and for vue-tsc (tsconfig).
  alias: { '#shared': sharedDir },
  imports: {
    dirs: ['composables', 'utils'],
  },
  runtimeConfig: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
    databasePath: process.env.DATABASE_PATH || '.data/storeforge.db',
    sessionSecret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
    public: {
      appName: 'StoreForge',
    },
  },
  nitro: {
    experimental: { asyncContext: true },
    alias: { '#shared': sharedDir },
    // better-sqlite3 is a native addon; bundling it would break the .node binding.
    externals: { external: ['better-sqlite3'] },
  },
  typescript: { strict: true },
  hooks: {
    'vite:extendConfig': (config) => {
      console.log('[probe] vite.root =', (config as any).root, '| vite.tsconfig =', (config as any).tsconfig)
    },
  },
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
