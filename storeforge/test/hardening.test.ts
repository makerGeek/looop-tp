import { describe, expect, it } from 'vitest'
import { createClient, patch, post } from './helpers'

const client = () => createClient()

let seq = 0
const uniqueEmail = (label: string) => `${label}-${Date.now()}-${seq++}@test.io`

describe('health', () => {
  it('reports the database, not just the process', async () => {
    const res = await client().json<{ status: string, database: string }>('/api/health')
    expect(res.status).toBe('ok')
    expect(res.database).toBe('ok')
  })
})

describe('security headers', () => {
  it('sets them on app and storefront responses', async () => {
    const res = await client().raw('/login')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })
})

describe('rate limiting', () => {
  it('locks out repeated failed sign-ins and says when to retry', async () => {
    // One client means one apparent IP, which is what a brute-force looks like.
    const c = client()
    const email = uniqueEmail('bruteforce')
    await c.json('/api/auth/signup', post({ email, password: 'password123', name: 'Target' }))

    const statuses: number[] = []
    for (let i = 0; i < 14; i++) {
      statuses.push(await c.status('/api/auth/login', post({ email, password: 'wrong-password' })))
    }

    // The per-account limit is 10 in 15 minutes, so the tail must be refused
    // while the first attempts still get an honest "wrong password".
    expect(statuses.slice(0, 5).every(s => s === 401)).toBe(true)
    expect(statuses).toContain(429)

    const blocked = await c.raw('/api/auth/login', post({ email, password: 'wrong-password' }))
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
  })
})

describe('AI-authored content', () => {
  /**
   * The storefront renders model-authored copy. Nothing in the renderer uses
   * v-html, so this asserts that a script tag arriving through a product title
   * comes back escaped rather than live.
   */
  it('escapes markup that arrives through the catalogue', async () => {
    const c = client()
    await c.json('/api/auth/signup', post({
      email: uniqueEmail('xss'), password: 'password123', name: 'XSS',
    }))

    const store = await c.json<{ id: string, slug: string }>('/api/stores', post({ name: 'XSS Co' }))
    const build = await c.raw(`/api/stores/${store.id}/build`, post({ message: 'a coffee roaster' }))
    await build.text()

    const payload = '<script>window.__pwned = 1</script>'
    await c.json(`/api/stores/${store.id}/products`, {
      method: 'PUT',
      body: JSON.stringify({ title: payload, price: '10.00', description: payload }),
    })
    await c.json(`/api/stores/${store.id}`, patch({ status: 'published' }))

    const html = await (await c.raw(`/s/${store.slug}/products`)).text()

    expect(html).not.toContain('<script>window.__pwned')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes it in generated artwork too', async () => {
    const res = await client().raw(
      `/img/art?seed=x&label=${encodeURIComponent('<script>alert(1)</script>')}`,
    )
    const svg = await res.text()

    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(svg).not.toContain('<script>')
  })
})

describe('input limits', () => {
  it('refuses an oversized build prompt rather than paying for it', async () => {
    const c = client()
    await c.json('/api/auth/signup', post({
      email: uniqueEmail('big'), password: 'password123', name: 'Big',
    }))
    const store = await c.json<{ id: string }>('/api/stores', post({ name: 'Big Co' }))

    expect(await c.status(`/api/stores/${store.id}/build`, post({
      message: 'x'.repeat(5000),
    }))).toBe(400)

    expect(await c.status(`/api/stores/${store.id}/build`, post({ message: '   ' }))).toBe(400)
  })
})
