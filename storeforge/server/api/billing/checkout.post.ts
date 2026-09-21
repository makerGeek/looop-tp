import { eq } from 'drizzle-orm'
import { useDb } from '../../db/index'
import { organizations, type PlanId } from '../../db/schema'
import { requireOrgAccess } from '../../utils/store-guard'
import { priceIdFor, useStripe } from '../../billing/stripe'
import { getSubscription, saveSubscription } from '../../billing/subscription'
import { serverConfig } from '../../config'

const PAID: PlanId[] = ['pro', 'business']

/** Starts a Stripe Checkout session for an upgrade. Owners only — it spends money. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ orgId?: string, plan?: PlanId }>(event)
  if (!body?.orgId) throw createError({ statusCode: 400, statusMessage: 'orgId is required' })

  const { user } = await requireOrgAccess(event, body.orgId, 'owner')

  const stripe = useStripe()
  if (!stripe) {
    throw createError({ statusCode: 503, statusMessage: 'Billing is not configured on this deployment' })
  }

  if (!body.plan || !PAID.includes(body.plan)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a paid plan' })
  }

  const price = priceIdFor(body.plan)
  if (!price) {
    throw createError({
      statusCode: 503,
      statusMessage: `No Stripe price is configured for the ${body.plan} plan`,
    })
  }

  const existing = await getSubscription(body.orgId)

  // Reuse the org's customer so upgrades, downgrades and invoices stay on one
  // record rather than scattering across duplicates.
  let customerId = existing.stripeCustomerId
  if (!customerId) {
    const [org] = await useDb().select({ name: organizations.name }).from(organizations)
      .where(eq(organizations.id, body.orgId)).limit(1)

    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name,
      metadata: { orgId: body.orgId },
    })
    customerId = customer.id
    await saveSubscription(body.orgId, { stripeCustomerId: customerId })
  }

  const appUrl = serverConfig().appUrl

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/pricing?upgraded=1`,
    cancel_url: `${appUrl}/pricing`,
    allow_promotion_codes: true,
    // Carried through to the webhook, which is what actually grants the plan —
    // the success redirect is only a UI hint and can be skipped by the user.
    subscription_data: { metadata: { orgId: body.orgId } },
    metadata: { orgId: body.orgId, plan: body.plan },
  })

  return { url: session.url }
})
