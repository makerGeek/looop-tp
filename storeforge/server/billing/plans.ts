import { eq } from 'drizzle-orm'
import { useDb } from '../db/index'
import { subscriptions, type PlanId } from '../db/schema'

/**
 * Plan entitlements.
 *
 * Kept in code rather than the database: limits change with a deploy, they are
 * needed synchronously on hot paths, and a mis-set database row should not be
 * able to hand out an unlimited plan.
 */
export interface Plan {
  id: PlanId
  name: string
  priceCentsMonthly: number
  stores: number
  aiBuildsPerMonth: number
  customDomains: number
  blurb: string
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceCentsMonthly: 0,
    stores: 1,
    aiBuildsPerMonth: 20,
    customDomains: 0,
    blurb: 'One store and enough builds to see whether this works for you.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceCentsMonthly: 2900,
    stores: 5,
    aiBuildsPerMonth: 500,
    customDomains: 1,
    blurb: 'For a working shop: five stores, a custom domain, room to iterate.',
  },
  business: {
    id: 'business',
    name: 'Business',
    priceCentsMonthly: 9900,
    stores: 25,
    aiBuildsPerMonth: 2000,
    customDomains: 10,
    blurb: 'Agencies and multi-brand sellers running many storefronts at once.',
  },
}

/** Subscription statuses that still entitle an org to its paid plan. */
const ENTITLED = new Set(['active', 'trialing', 'past_due'])

/**
 * The plan an organization is currently entitled to.
 *
 * Falls back to free when there is no subscription row, or when Stripe has told
 * us the subscription lapsed — so a failed payment degrades rather than locking
 * the merchant out of their own data.
 */
export async function planFor(orgId: string): Promise<PlanId> {
  const [row] = await useDb().select().from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1)

  if (!row) return 'free'
  if (!ENTITLED.has(row.status)) return 'free'
  return row.plan
}

export const storeLimitFor = (plan: PlanId) => PLANS[plan].stores
export const buildLimitFor = (plan: PlanId) => PLANS[plan].aiBuildsPerMonth
export const domainLimitFor = (plan: PlanId) => PLANS[plan].customDomains
