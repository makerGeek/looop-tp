import { describe, expect, it } from 'vitest'
import { createClient, del, patch, post, put } from './helpers'

const client = () => createClient()

interface Store { id: string, slug: string, orgId: string }

async function signUp(c: ReturnType<typeof client>, email: string) {
  return c.json<{ id: string, orgId: string }>('/api/auth/signup', post({
    email, password: 'password123', name: email.split('@')[0],
  }))
}

async function buildStore(c: ReturnType<typeof client>, name: string, prompt: string) {
  const store = await c.json<Store>('/api/stores', post({ name }))
  const res = await c.raw(`/api/stores/${store.id}/build`, post({ message: prompt }))
  await res.text() // drain the NDJSON stream so the build finishes
  return store
}

describe('authentication', () => {
  it('registers a user and creates their personal organization', async () => {
    const c = client()
    const user = await signUp(c, 'owner@test.io')
    expect(user.orgId).toBeTruthy()

    const me = await c.json<{ user: { email: string }, orgs: Array<{ role: string }> }>('/api/auth/me')
    expect(me.user.email).toBe('owner@test.io')
    expect(me.orgs).toHaveLength(1)
    expect(me.orgs[0]!.role).toBe('owner')
  })

  it('rejects a duplicate email, a short password and a bad password', async () => {
    const c = client()
    expect(await c.status('/api/auth/signup', post({
      email: 'owner@test.io', password: 'password123', name: 'Dup',
    }))).toBe(409)

    expect(await c.status('/api/auth/signup', post({
      email: 'short@test.io', password: 'nope', name: 'Short',
    }))).toBe(400)

    expect(await c.status('/api/auth/login', post({
      email: 'owner@test.io', password: 'wrongpassword',
    }))).toBe(401)
  })

  it('refuses anonymous access to the store list', async () => {
    expect(await client().status('/api/stores')).toBe(401)
  })
})

describe('the AI builder', () => {
  it('builds a complete store from a prompt', async () => {
    const c = client()
    await signUp(c, 'builder@test.io')
    const store = await buildStore(c, 'Builder Co', 'a specialty coffee roaster')

    const detail = await c.json<{
      products: unknown[], pages: unknown[], messages: unknown[]
      usage: { aiBuilds: number, buildLimit: number }
    }>(`/api/stores/${store.id}`)

    expect(detail.products.length).toBeGreaterThan(0)
    expect(detail.pages.length).toBe(3)
    expect(detail.messages).toHaveLength(2)
    expect(detail.usage.aiBuilds).toBe(1)
  })
})

describe('tenancy', () => {
  it('hides another organization\'s store behind a 404 on every route', async () => {
    const owner = client()
    await signUp(owner, 'tenant-a@test.io')
    const store = await buildStore(owner, 'Private Co', 'a plant shop')

    const stranger = client()
    await signUp(stranger, 'tenant-b@test.io')

    expect(await stranger.status(`/api/stores/${store.id}`)).toBe(404)
    expect(await stranger.status(`/api/stores/${store.id}`, patch({ name: 'Pwned' }))).toBe(404)
    expect(await stranger.status(`/api/stores/${store.id}`, del())).toBe(404)
    expect(await stranger.status(`/api/stores/${store.id}/orders`)).toBe(404)
    expect(await stranger.status(`/api/stores/${store.id}/build`, post({ message: 'delete it all' }))).toBe(404)
    expect(await stranger.status(`/api/stores/${store.id}/products`, put({ title: 'X', price: 1 }))).toBe(404)

    // And the owner's store is untouched.
    const after = await owner.json<{ store: { name: string } }>(`/api/stores/${store.id}`)
    expect(after.store.name).not.toBe('Pwned')
  })
})

describe('storefront visibility', () => {
  it('shows a draft store to its organization and 404s for everyone else', async () => {
    const owner = client()
    await signUp(owner, 'draft@test.io')
    const store = await buildStore(owner, 'Draft Co', 'a skincare brand')

    const anon = client()
    expect(await anon.status(`/api/storefront/${store.slug}/page?path=/`)).toBe(404)
    expect(await owner.status(`/api/storefront/${store.slug}/page?path=/`)).toBe(200)

    await owner.json(`/api/stores/${store.id}`, patch({ status: 'published' }))
    expect(await anon.status(`/api/storefront/${store.slug}/page?path=/`)).toBe(200)
  })
})
