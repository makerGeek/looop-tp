import type { H3Event } from 'h3'

/** Carts are per-store, so two storefronts in one browser never share a cart. */
export const cartCookieName = (slug: string) => `sf_cart_${slug}`

export function setCartCookie(event: H3Event, slug: string, token: string): void {
  setCookie(event, cartCookieName(slug), token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: !import.meta.dev,
    maxAge: 60 * 60 * 24 * 14,
  })
}
