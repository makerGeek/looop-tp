import { requireOrgAccess } from '../../utils/store-guard'
import { useStripe } from '../../billing/stripe'
import { getSubscription } from '../../billing/subscription'
import { serverConfig } from '../../config'

/** Opens the Stripe Customer Portal for changing or cancelling a plan. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ orgId?: string }>(event)
  if (!body?.orgId) throw createError({ statusCode: 400, statusMessage: 'orgId is required' })

  await requireOrgAccess(event, body.orgId, 'owner')

  const stripe = useStripe()
  if (!stripe) {
    throw createError({ statusCode: 503, statusMessage: 'Billing is not configured on this deployment' })
  }

  const subscription = await getSubscription(body.orgId)
  if (!subscription.stripeCustomerId) {
    throw createError({ statusCode: 400, statusMessage: 'This organization has no billing account yet' })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${serverConfig().appUrl}/pricing`,
  })

  return { url: session.url }
})
