import { listOrgsForUser } from '../../db/repo'
import { requireUser } from '../../utils/auth'
import { PLANS, planFor } from '../../billing/plans'
import { usageFor } from '../../billing/usage'
import { getSubscription } from '../../billing/subscription'
import { serverConfig } from '../../config'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const orgs = await listOrgsForUser(user.id)
  const orgId = String(getQuery(event).orgId ?? '') || orgs[0]?.orgId

  if (!orgId || !orgs.some(o => o.orgId === orgId)) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
  }

  const [plan, usage, subscription] = await Promise.all([
    planFor(orgId),
    usageFor(orgId),
    getSubscription(orgId),
  ])

  return {
    orgId,
    plans: Object.values(PLANS),
    currentPlan: plan,
    usage,
    subscription: {
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      hasBillingAccount: !!subscription.stripeCustomerId,
    },
    // Until Stripe keys are set, the UI shows plans without an upgrade button
    // rather than offering a checkout that cannot work.
    billingEnabled: !!serverConfig().stripeSecretKey,
  }
})
