import { z } from 'zod'

/**
 * Validated server configuration.
 *
 * Nuxt's runtimeConfig hands back whatever is set, including empty strings. This
 * checks the resolved values once at first use and throws a message naming every
 * missing key, so a misconfigured deploy fails at boot instead of halfway through
 * a checkout.
 */
const schema = z.object({
  databaseUrl: z.string().min(1, 'NUXT_DATABASE_URL is required (postgres://…)'),
  sessionSecret: z.string().min(32, 'NUXT_SESSION_SECRET must be at least 32 characters'),

  // Optional: the product degrades in a defined way when these are absent.
  anthropicApiKey: z.string().default(''),
  anthropicModel: z.string().default('claude-opus-5'),
  resendApiKey: z.string().default(''),
  emailFrom: z.string().default('StoreForge <noreply@storeforge.app>'),
  stripeSecretKey: z.string().default(''),
  stripeWebhookSecret: z.string().default(''),
  stripePriceProMonthly: z.string().default(''),
  stripePriceBusinessMonthly: z.string().default(''),
  sentryDsn: z.string().default(''),
  appUrl: z.string().url().default('http://localhost:3000'),
})

export type ServerConfig = z.infer<typeof schema>

let cached: ServerConfig | null = null

export function serverConfig(): ServerConfig {
  if (cached) return cached

  const runtime = useRuntimeConfig()
  const parsed = schema.safeParse({
    databaseUrl: runtime.databaseUrl || process.env.DATABASE_URL || '',
    sessionSecret: runtime.sessionSecret || process.env.SESSION_SECRET || '',
    anthropicApiKey: runtime.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: runtime.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-opus-5',
    resendApiKey: runtime.resendApiKey || process.env.RESEND_API_KEY || '',
    emailFrom: runtime.emailFrom || undefined,
    stripeSecretKey: runtime.stripeSecretKey || process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: runtime.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '',
    stripePriceProMonthly: runtime.stripePriceProMonthly || '',
    stripePriceBusinessMonthly: runtime.stripePriceBusinessMonthly || '',
    sentryDsn: runtime.sentryDsn || process.env.SENTRY_DSN || '',
    appUrl: runtime.public?.appUrl || undefined,
  })

  if (!parsed.success) {
    const problems = parsed.error.issues.map(i => `  · ${i.message}`).join('\n')
    throw new Error(`StoreForge is misconfigured:\n${problems}\n`)
  }

  cached = parsed.data
  return cached
}

/** Test helper: forget the cached config so a new environment takes effect. */
export function resetConfigCache(): void {
  cached = null
}
