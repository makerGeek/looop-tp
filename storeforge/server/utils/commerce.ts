import { randomBytes } from 'node:crypto'
import type { CartLine, CartTotals, ProductRecord, StoreSettings } from '#shared/types'

/**
 * Computes order totals.
 *
 * All money is integer cents and every derived figure is recomputed here from
 * the catalogue — never from numbers the client sent — so a tampered cart
 * payload cannot change what is charged.
 */
export function computeTotals(lines: CartLine[], settings: StoreSettings): CartTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0)

  const qualifiesFree = settings.freeShippingThresholdCents !== null
    && subtotalCents >= settings.freeShippingThresholdCents

  const shippingCents = subtotalCents === 0 || qualifiesFree ? 0 : settings.shippingFlatCents
  const taxCents = Math.round((subtotalCents * settings.taxRateBps) / 10_000)

  return {
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
  }
}

/** Builds a cart line from the catalogue, ignoring any client-supplied pricing. */
export function buildLine(product: ProductRecord, variantId: string | null, quantity: number): CartLine {
  const variant = variantId ? product.variants.find(v => v.id === variantId) ?? null : null

  return {
    productId: product.id,
    variantId: variant?.id ?? null,
    handle: product.handle,
    title: product.title,
    variantTitle: variant?.title ?? null,
    unitPriceCents: variant?.priceCents ?? product.priceCents,
    quantity: Math.max(1, Math.min(99, Math.trunc(quantity) || 1)),
    image: product.image,
  }
}

export function mergeLine(lines: CartLine[], incoming: CartLine): CartLine[] {
  const idx = lines.findIndex(l => l.productId === incoming.productId && l.variantId === incoming.variantId)
  if (idx === -1) return [...lines, incoming]

  const next = [...lines]
  next[idx] = { ...next[idx]!, quantity: Math.min(99, next[idx]!.quantity + incoming.quantity) }
  return next
}

export interface PaymentResult {
  ok: boolean
  reference: string
  message?: string
}

/**
 * Simulated payment gateway.
 *
 * StoreForge ships without a real processor: this records a reference and
 * always succeeds. Card details are never collected, transmitted or stored —
 * the checkout form asks only for contact and shipping. Swap this function for
 * a Stripe PaymentIntent confirmation to take real money.
 */
export function capturePayment(amountCents: number, email: string): PaymentResult {
  if (amountCents <= 0) {
    return { ok: false, reference: '', message: 'Order total must be greater than zero' }
  }
  const reference = `sim_${randomBytes(9).toString('hex')}`
  return { ok: true, reference, message: `Simulated capture of ${amountCents} cents for ${email}` }
}
