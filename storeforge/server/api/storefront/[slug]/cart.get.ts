import type { CartView } from '#shared/types'
import { getOrCreateCart } from '../../../db/repo'
import { loadStorefront } from '../../../utils/storefront'
import { computeTotals } from '../../../utils/commerce'

const CART_COOKIE = (slug: string) => `sf_cart_${slug}`

export default defineEventHandler((event): CartView => {
  const slug = getRouterParam(event, 'slug')!
  const store = loadStorefront(event, slug)

  const cart = getOrCreateCart(store.id, getCookie(event, CART_COOKIE(slug)))
  setCookie(event, CART_COOKIE(slug), cart.token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14,
  })

  return {
    token: cart.token,
    lines: cart.lines,
    totals: computeTotals(cart.lines, store.settings),
    currency: store.settings.currency,
  }
})
