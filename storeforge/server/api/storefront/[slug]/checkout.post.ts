import { clearCart, createOrder, decrementInventory, getOrCreateCart } from '../../../db/repo'
import { loadStorefront } from '../../../utils/storefront'
import { capturePayment, computeTotals } from '../../../utils/commerce'

const CART_COOKIE = (slug: string) => `sf_cart_${slug}`

interface CheckoutBody {
  email?: string
  name?: string
  address1?: string
  address2?: string
  city?: string
  region?: string
  postal?: string
  country?: string
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const store = loadStorefront(event, slug)
  const body = await readBody<CheckoutBody>(event)

  const cart = getOrCreateCart(store.id, getCookie(event, CART_COOKIE(slug)))
  if (!cart.lines.length) {
    throw createError({ statusCode: 400, statusMessage: 'Your cart is empty' })
  }

  const email = (body?.email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address' })
  }

  const required: Array<[keyof CheckoutBody, string]> = [
    ['name', 'Full name'], ['address1', 'Address'], ['city', 'City'],
    ['postal', 'Postal code'], ['country', 'Country'],
  ]
  for (const [field, label] of required) {
    if (!String(body?.[field] ?? '').trim()) {
      throw createError({ statusCode: 400, statusMessage: `${label} is required` })
    }
  }

  // Recomputed server-side from catalogue prices — the client never sets totals.
  const totals = computeTotals(cart.lines, store.settings)

  const payment = capturePayment(totals.totalCents, email)
  if (!payment.ok) {
    throw createError({ statusCode: 402, statusMessage: payment.message ?? 'Payment failed' })
  }

  const order = createOrder({
    storeId: store.id,
    email,
    status: 'paid',
    lines: cart.lines,
    totals,
    currency: store.settings.currency,
    shipping: {
      name: String(body!.name).trim(),
      address1: String(body!.address1).trim(),
      address2: body?.address2 ? String(body.address2).trim() : undefined,
      city: String(body!.city).trim(),
      region: String(body?.region ?? '').trim(),
      postal: String(body!.postal).trim(),
      country: String(body!.country).trim(),
    },
    paymentRef: payment.reference,
  })

  for (const line of cart.lines) {
    decrementInventory(line.productId, line.variantId, line.quantity)
  }
  clearCart(store.id, cart.token)

  return { orderId: order.id, number: order.number, totals: order.totals, currency: order.currency }
})
