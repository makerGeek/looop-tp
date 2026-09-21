import Stripe from 'stripe'
import { serverConfig } from '../config'
import { PLANS, type Plan } from './plans'
import type { PlanId } from '../db/schema'

let client: Stripe | null = null

/**
 * The Stripe client, or null when billing isn't configured.
 *
 * Returning null rather than throwing lets the rest of the product run without
 * Stripe keys — every organization simply stays on the free plan, and the UI
 * shows plans without an upgrade button instead of offering a broken checkout.
 */
export function useStripe(): Stripe | null {
  const { stripeSecretKey } = serverConfig()
  if (!stripeSecretKey) return null

  if (!client) {
    client = new Stripe(stripeSecretKey, {
      // Pinning the version means a Stripe-side upgrade can't change payload
      // shapes underneath the webhook handler.
      apiVersion: '2026-08-26.dahlia',
      typescript: true,
      maxNetworkRetries: 2,
    })
  }
  return client
}

export const billingEnabled = () => !!serverConfig().stripeSecretKey

/** Maps a plan to the Stripe Price it is sold as. */
export function priceIdFor(plan: PlanId): string | null {
  const config = serverConfig()
  switch (plan) {
    case 'pro': return config.stripePriceProMonthly || null
    case 'business': return config.stripePriceBusinessMonthly || null
    default: return null
  }
}

/** The reverse lookup, for turning a webhook's price back into a plan. */
export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null
  const config = serverConfig()
  if (priceId === config.stripePriceProMonthly) return 'pro'
  if (priceId === config.stripePriceBusinessMonthly) return 'business'
  return null
}

export function paidPlans(): Plan[] {
  return Object.values(PLANS).filter(p => p.priceCentsMonthly > 0)
}
