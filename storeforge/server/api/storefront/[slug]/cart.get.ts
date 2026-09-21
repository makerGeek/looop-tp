import type { CartView } from '#shared/types'
import { getOrCreateCart } from '../../../db/repo'
import { loadStorefront } from '../../../utils/storefront'
import { computeTotals } from '../../../utils/commerce'
import { cartCookieName, setCartCookie } from '../../../utils/cart-cookie'

export default defineEventHandler(async (event): Promise<CartView> => {
  const slug = getRouterParam(event, 'slug')!
  const store = await loadStorefront(event, slug)

  const cart = await getOrCreateCart(store.id, getCookie(event, cartCookieName(slug)))
  setCartCookie(event, slug, cart.token)

  return {
    token: cart.token,
    lines: cart.lines,
    totals: computeTotals(cart.lines, store.settings),
    currency: store.settings.currency,
  }
})
