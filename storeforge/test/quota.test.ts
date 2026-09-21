import { describe, expect, it } from 'vitest'
import { createClient, post } from './helpers'

const client = () => createClient()

/**
 * The free plan allows 20 AI builds a month. Exhausting it through the real
 * endpoint is what proves the quota is enforced server-side rather than in the
 * UI — an unmetered build endpoint is the expensive failure mode.
 */
describe('AI build quota', () => {
  it('counts builds, reports remaining, and refuses past the limit', async () => {
    const c = client()
    await c.json('/api/auth/signup', post({
      email: `quota-${Date.now()}@test.io`, password: 'password123', name: 'Quota',
    }))

    const store = await c.json<{ id: string }>('/api/stores', post({ name: 'Quota Co' }))

    const runBuild = async () => {
      const res = await c.raw(`/api/stores/${store.id}/build`, post({ message: 'a coffee roaster' }))
      await res.text()
      return res.status
    }

    await runBuild()
    let detail = await c.json<{ usage: { aiBuilds: number, buildLimit: number, remaining: number } }>(
      `/api/stores/${store.id}`,
    )
    expect(detail.usage.aiBuilds).toBe(1)
    expect(detail.usage.buildLimit).toBe(20)
    expect(detail.usage.remaining).toBe(19)

    // Burn the rest of the month's allowance.
    for (let i = 1; i < 20; i++) await runBuild()

    detail = await c.json(`/api/stores/${store.id}`)
    expect(detail.usage.aiBuilds).toBe(20)
    expect(detail.usage.remaining).toBe(0)

    // The 21st is refused with a payment-required status, not a 500.
    const refused = await c.raw(`/api/stores/${store.id}/build`, post({ message: 'one more' }))
    expect(refused.status).toBe(402)
    expect(await refused.text()).toMatch(/upgrade/i)
  })

  it('enforces the free plan store limit', async () => {
    const c = client()
    await c.json('/api/auth/signup', post({
      email: `stores-${Date.now()}@test.io`, password: 'password123', name: 'Limit',
    }))

    await c.json('/api/stores', post({ name: 'First' }))

    const second = await c.raw('/api/stores', post({ name: 'Second' }))
    expect(second.status).toBe(402)
    expect(await second.text()).toMatch(/upgrade/i)
  })
})
