import { eq } from 'drizzle-orm'
import { useDb } from '../db/index'
import { subscriptions, type PlanId } from '../db/schema'

export interface SubscriptionState {
  plan: PlanId
  status: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export async function getSubscription(orgId: string): Promise<SubscriptionState> {
  const [row] = await useDb().select().from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1)

  if (!row) {
    return {
      plan: 'free',
      status: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  }

  return {
    plan: row.plan,
    status: row.status,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  }
}

/** Upserts the subscription row. Only the fields supplied are touched. */
export async function saveSubscription(
  orgId: string,
  patch: Partial<{
    plan: PlanId
    status: string
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
  }>,
): Promise<void> {
  await useDb().insert(subscriptions)
    .values({
      orgId,
      plan: patch.plan ?? 'free',
      status: patch.status ?? 'active',
      stripeCustomerId: patch.stripeCustomerId ?? null,
      stripeSubscriptionId: patch.stripeSubscriptionId ?? null,
      currentPeriodEnd: patch.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: patch.cancelAtPeriodEnd ?? false,
    })
    .onConflictDoUpdate({
      target: subscriptions.orgId,
      set: { ...patch, updatedAt: new Date() },
    })
}

/** Finds the org a Stripe customer belongs to, for webhooks without metadata. */
export async function orgForCustomer(customerId: string): Promise<string | null> {
  const [row] = await useDb().select({ orgId: subscriptions.orgId }).from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1)
  return row?.orgId ?? null
}
