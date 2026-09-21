import type { CartLine, CartView } from '#shared/types'
import { getOrCreateCart, getProduct, saveCart } from '../../../db/repo'
import { loadStorefront } from '../../../utils/storefront'
import { buildLine, computeTotals, mergeLine } from '../../../utils/commerce'
import { cartCookieName, setCartCookie } from '../../../utils/cart-cookie'

type Action =
  | { action: 'add', handle: string, variantId?: string | null, quantity?: number }
  | { action: 'setQuantity', productId: string, variantId?: string | null, quantity: number }
  | { action: 'remove', productId: string, variantId?: string | null }
  | { action: 'clear' }

export default defineEventHandler(async (event): Promise<CartView> => {
  const slug = getRouterParam(event, 'slug')!
  const store = await loadStorefront(event, slug)
  const body = await readBody<Action>(event)

  const cart = await getOrCreateCart(store.id, getCookie(event, cartCookieName(slug)))
  setCartCookie(event, slug, cart.token)

  let lines: CartLine[] = cart.lines

  switch (body?.action) {
    case 'add': {
      const product = await getProduct(store.id, body.handle)
      if (!product || product.status !== 'active') {
        throw createError({ statusCode: 404, statusMessage: 'Product not found' })
      }
      // Price comes from the catalogue, never from the request body.
      lines = mergeLine(lines, buildLine(product, body.variantId ?? null, body.quantity ?? 1))
      break
    }
    case 'setQuantity': {
      const qty = Math.max(0, Math.min(99, Math.trunc(body.quantity) || 0))
      lines = qty === 0
        ? lines.filter(l => !(l.productId === body.productId && l.variantId === (body.variantId ?? null)))
        : lines.map(l => (l.productId === body.productId && l.variantId === (body.variantId ?? null))
            ? { ...l, quantity: qty }
            : l)
      break
    }
    case 'remove':
      lines = lines.filter(l => !(l.productId === body.productId && l.variantId === (body.variantId ?? null)))
      break
    case 'clear':
      lines = []
      break
    default:
      throw createError({ statusCode: 400, statusMessage: 'Unknown cart action' })
  }

  await saveCart(store.id, cart.token, lines)

  return {
    token: cart.token,
    lines,
    totals: computeTotals(lines, store.settings),
    currency: store.settings.currency,
  }
})
