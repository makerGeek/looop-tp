/**
 * Security headers.
 *
 * The Content-Security-Policy is deliberately not set here: storefront themes
 * set colours through inline `style` attributes, and Nuxt's hydration payload
 * is an inline script, so a policy strict enough to be worth having would break
 * every generated store. The injection surface is small by construction —
 * AI-authored content renders through Vue interpolation, never `v-html` — and
 * there is a test asserting that. A nonce-based policy is the right fix and is
 * worth doing before opening custom domains.
 */
export default defineEventHandler((event) => {
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setHeader(event, 'X-Frame-Options', event.path.startsWith('/s/') ? 'SAMEORIGIN' : 'DENY')
  setHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // Only meaningful over TLS, and setting it in development would poison
  // localhost for other projects.
  if (!import.meta.dev) {
    setHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
})
