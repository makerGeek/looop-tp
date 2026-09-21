import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createClient, post } from './helpers'

const client = () => createClient()
const WEBHOOK_SECRET = 'whsec_test_secret_for_signature_checks'

let seq = 0
const uniqueEmail = (label: string) => `${label}-${Date.now()}-${seq++}@test.io`

async function signUp(c: ReturnType<typeof client>, email: string) {
  return c.json<{ id: string, orgId: string }>('/api/auth/signup', post({
    email, password: 'password123', name: 'Billing',
  }))
}

/**
 * Signs a payload the way Stripe does.
 *
 * This lets the suite exercise the real verification path rather than stubbing
 * it out — signature handling is exactly the part that must not regress.
 */
function stripeSignature(payload: string, secret = WEBHOOK_SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

function subscriptionEvent(orgId: string, options: {
  id?: string
  priceId?: string
  status?: string
  cancelAtPeriodEnd?: boolean
  type?: string
} = {}) {
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86_400
  return {
    id: options.id ?? `evt_test_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    type: options.type ?? 'customer.subscription.updated',
    data: {
      object: {
        id: `sub_test_${orgId.slice(0, 8)}`,
        object: 'subscription',
        customer: `cus_test_${orgId.slice(0, 8)}`,
        status: options.status ?? 'active',
        cancel_at_period_end: options.cancelAtPeriodEnd ?? false,
        metadata: { orgId },
        items: {
          object: 'list',
          data: [{
            id: 'si_test',
            object: 'subscription_item',
            price: { id: options.priceId ?? 'price_test_pro', object: 'price' },
            current_period_end: periodEnd,
          }],
        },
      },
    },
  }
}

async function sendWebhook(payload: object, signature?: string) {
  const body = JSON.stringify(payload)
  return fetch(`${process.env.TEST_BASE_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature ?? stripeSignature(body),
    },
    body,
  })
}

describe('the Stripe webhook', () => {
  it('refuses an unsigned or wrongly-signed payload', async () => {
    const c = client()
    const { orgId } = await signUp(c, uniqueEmail('sig'))
    const payload = subscriptionEvent(orgId)

    const unsigned = await fetch(`${process.env.TEST_BASE_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    expect(unsigned.status).toBe(400)

    const wrongSecret = await sendWebhook(
      payload,
      stripeSignature(JSON.stringify(payload), 'whsec_the_wrong_secret'),
    )
    expect(wrongSecret.status).toBe(400)

    // A signature over different bytes than the body must also fail.
    const mismatched = await sendWebhook(payload, stripeSignature('{"tampered":true}'))
    expect(mismatched.status).toBe(400)
  })

  it('grants the plan named by the subscription price', async () => {
    const c = client()
    const { orgId } = await signUp(c, uniqueEmail('grant'))

    let plans = await c.json<{ currentPlan: string }>(`/api/billing/plans?orgId=${orgId}`)
    expect(plans.currentPlan).toBe('free')

    const res = await sendWebhook(subscriptionEvent(orgId, { priceId: 'price_test_business' }))
    expect(res.status).toBe(200)

    plans = await c.json(`/api/billing/plans?orgId=${orgId}`)
    expect(plans.currentPlan).toBe('business')
  })

  it('raises the build quota with the plan', async () => {
    const c = client()
    const { orgId } = await signUp(c, uniqueEmail('quota'))

    let plans = await c.json<{ usage: { buildLimit: number } }>(`/api/billing/plans?orgId=${orgId}`)
    expect(plans.usage.buildLimit).toBe(20)

    await sendWebhook(subscriptionEvent(orgId, { priceId: 'price_test_pro' }))

    plans = await c.json(`/api/billing/plans?orgId=${orgId}`)
    expect(plans.usage.buildLimit).toBe(500)
  })

  it('ignores a replayed event', async () => {
    const c = client()
    const { orgId } = await signUp(c, uniqueEmail('replay'))

    const event = subscriptionEvent(orgId, { priceId: 'price_test_pro', id: 'evt_replay_fixed' })

    const first = await sendWebhook(event)
    expect(await first.json()).toMatchObject({ received: true })

    // Same event id, but now claiming a bigger plan: the replay must not apply.
    const tampered = subscriptionEvent(orgId, { priceId: 'price_test_business', id: 'evt_replay_fixed' })
    const second = await sendWebhook(tampered)
    expect(await second.json()).toMatchObject({ received: true, duplicate: true })

    const plans = await c.json<{ currentPlan: string }>(`/api/billing/plans?orgId=${orgId}`)
    expect(plans.currentPlan).toBe('pro')
  })

  it('drops back to free when the subscription is cancelled', async () => {
    const c = client()
    const { orgId } = await signUp(c, uniqueEmail('cancel'))

    await sendWebhook(subscriptionEvent(orgId, { priceId: 'price_test_pro' }))
    expect((await c.json<{ currentPlan: string }>(`/api/billing/plans?orgId=${orgId}`)).currentPlan).toBe('pro')

    await sendWebhook(subscriptionEvent(orgId, {
      priceId: 'price_test_pro',
      status: 'canceled',
      type: 'customer.subscription.deleted',
    }))

    expect((await c.json<{ currentPlan: string }>(`/api/billing/plans?orgId=${orgId}`)).currentPlan).toBe('free')
  })

  it('keeps the plan on a failed payment rather than cutting access off', async () => {
    const c = client()
    const { orgId } = await signUp(c, uniqueEmail('pastdue'))

    await sendWebhook(subscriptionEvent(orgId, { priceId: 'price_test_pro' }))
    await sendWebhook(subscriptionEvent(orgId, { priceId: 'price_test_pro', status: 'past_due' }))

    const plans = await c.json<{ currentPlan: string, subscription: { status: string } }>(
      `/api/billing/plans?orgId=${orgId}`,
    )
    expect(plans.subscription.status).toBe('past_due')
    expect(plans.currentPlan).toBe('pro')
  })

  it('does not grant anything for an unrecognised price', async () => {
    const c = client()
    const { orgId } = await signUp(c, uniqueEmail('unknown'))

    await sendWebhook(subscriptionEvent(orgId, { priceId: 'price_not_ours' }))

    expect((await c.json<{ currentPlan: string }>(`/api/billing/plans?orgId=${orgId}`)).currentPlan).toBe('free')
  })
})

describe('billing permissions', () => {
  it('lets only an owner start checkout or open the portal', async () => {
    const owner = client()
    const { orgId } = await signUp(owner, uniqueEmail('owner'))

    const memberEmail = uniqueEmail('member')
    const invite = await owner.json<{ inviteLink?: string }>(`/api/orgs/${orgId}/invitations`, post({
      email: memberEmail, role: 'admin',
    }))

    const member = client()
    await signUp(member, memberEmail)
    await member.json('/api/invitations/accept', post({ token: invite.inviteLink!.split('/invite/')[1] }))

    // An admin manages stores and people, but not money.
    expect(await member.status('/api/billing/checkout', post({ orgId, plan: 'pro' }))).toBe(403)
    expect(await member.status('/api/billing/portal', post({ orgId }))).toBe(403)

    // And a stranger sees nothing at all.
    const stranger = client()
    await signUp(stranger, uniqueEmail('stranger'))
    expect(await stranger.status('/api/billing/checkout', post({ orgId, plan: 'pro' }))).toBe(404)
    expect(await stranger.status(`/api/billing/plans?orgId=${orgId}`)).toBe(404)
  })

  it('rejects a checkout for a plan that is not sold', async () => {
    const c = client()
    const { orgId } = await signUp(c, uniqueEmail('badplan'))
    expect(await c.status('/api/billing/checkout', post({ orgId, plan: 'free' }))).toBe(400)
  })

  it('refuses the portal before there is a billing account', async () => {
    const c = client()
    const { orgId } = await signUp(c, uniqueEmail('noaccount'))
    expect(await c.status('/api/billing/portal', post({ orgId }))).toBe(400)
  })
})
