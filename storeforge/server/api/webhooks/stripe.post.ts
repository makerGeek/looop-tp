import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { useDb } from '../../db/index'
import { webhookEvents } from '../../db/schema'
import { planForPrice, useStripe } from '../../billing/stripe'
import { orgForCustomer, saveSubscription } from '../../billing/subscription'
import { serverConfig } from '../../config'

/**
 * Stripe webhook.
 *
 * This endpoint — not the success redirect — is what grants and revokes plans:
 * a user can close the tab before redirecting, and a card can fail months
 * later. Signature verification runs against the raw body, because any
 * re-serialisation would change the bytes the signature covers.
 */
export default defineEventHandler(async (event) => {
  const stripe = useStripe()
  const { stripeWebhookSecret } = serverConfig()

  if (!stripe || !stripeWebhookSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Billing is not configured' })
  }

  const signature = getHeader(event, 'stripe-signature')
  const raw = await readRawBody(event, false)

  if (!signature || !raw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing signature or body' })
  }

  let parsed: Stripe.Event
  try {
    parsed = await stripe.webhooks.constructEventAsync(raw, signature, stripeWebhookSecret)
  }
  catch (err) {
    // An unverifiable event is either a misconfiguration or a forgery; either
    // way it must not reach the handlers below.
    throw createError({
      statusCode: 400,
      statusMessage: `Signature verification failed: ${err instanceof Error ? err.message : 'unknown'}`,
    })
  }

  const db = useDb()

  // Stripe redelivers on any non-2xx and on its own retry schedule. Recording
  // the id first makes a replay a no-op rather than a second upgrade.
  const claimed = await db.insert(webhookEvents)
    .values({ id: parsed.id, type: parsed.type })
    .onConflictDoNothing({ target: webhookEvents.id })
    .returning({ id: webhookEvents.id })

  if (!claimed.length) {
    return { received: true, duplicate: true }
  }

  try {
    await handle(parsed, stripe)
  }
  catch (err) {
    // Release the claim so Stripe's redelivery can retry a transient failure
    // rather than being swallowed as a duplicate.
    await db.delete(webhookEvents).where(eq(webhookEvents.id, parsed.id))
    throw err
  }

  return { received: true }
})

async function handle(event: Stripe.Event, stripe: Stripe): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.orgId
      if (!orgId || !session.subscription) return

      const subscription = await stripe.subscriptions.retrieve(String(session.subscription))
      await applySubscription(orgId, subscription)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const orgId = subscription.metadata?.orgId
        ?? await orgForCustomer(String(subscription.customer))
      if (!orgId) return

      await applySubscription(orgId, subscription)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const orgId = await orgForCustomer(String(invoice.customer))
      if (!orgId) return

      // Mark it, but don't downgrade yet — Stripe retries, and pulling the plan
      // on the first failed charge punishes an expired card mid-billing-cycle.
      await saveSubscription(orgId, { status: 'past_due' })
      break
    }
  }
}

/** Projects a Stripe subscription onto our plan state. */
async function applySubscription(orgId: string, subscription: Stripe.Subscription): Promise<void> {
  const item = subscription.items.data[0]
  const plan = planForPrice(item?.price.id)

  // A subscription for a price we don't recognise must not silently grant a
  // plan; fall back to free and leave the status for an operator to see.
  const ended = subscription.status === 'canceled' || subscription.status === 'incomplete_expired'

  const periodEnd = item?.current_period_end ?? null

  await saveSubscription(orgId, {
    plan: ended || !plan ? 'free' : plan,
    status: subscription.status,
    stripeCustomerId: String(subscription.customer),
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
  })
}
