import { describe, expect, it } from 'vitest'
import { createClient, patch, post } from './helpers'

const client = () => createClient()

interface Cart {
  lines: Array<{ productId: string, handle: string, unitPriceCents: number, quantity: number, variantId: string | null }>
  totals: { subtotalCents: number, shippingCents: number, taxCents: number, totalCents: number }
}

/** One published coffee store, shared by the cases below. */
async function publishedStore() {
  const merchant = client()
  await merchant.json('/api/auth/signup', post({
    email: `shop-${Date.now()}@test.io`, password: 'password123', name: 'Merchant',
  }))

  const store = await merchant.json<{ id: string, slug: string }>('/api/stores', post({ name: 'Shop Co' }))
  const build = await merchant.raw(`/api/stores/${store.id}/build`, post({ message: 'a specialty coffee roaster' }))
  await build.text()
  await merchant.json(`/api/stores/${store.id}`, patch({ status: 'published' }))

  return { merchant, store }
}

describe('cart pricing', () => {
  it('prices lines from the catalogue and ignores prices sent by the client', async () => {
    const { store } = await publishedStore()
    const shopper = client()

    // The catalogue price for this product is $21.00.
    const cart = await shopper.json<Cart>(`/api/storefront/${store.slug}/cart`, post({
      action: 'add',
      handle: 'yirgacheffe-washed',
      quantity: 2,
      // A tampered client trying to set its own price:
      unitPriceCents: 1,
      price: 0.01,
    }))

    expect(cart.lines).toHaveLength(1)
    expect(cart.lines[0]!.unitPriceCents).toBe(2100)
    expect(cart.totals.subtotalCents).toBe(4200)
  })

  it('applies flat shipping under the threshold and free shipping over it', async () => {
    const { store } = await publishedStore()
    const shopper = client()

    const small = await shopper.json<Cart>(`/api/storefront/${store.slug}/cart`, post({
      action: 'add', handle: 'yirgacheffe-washed', quantity: 1,
    }))
    expect(small.totals.subtotalCents).toBe(2100)
    expect(small.totals.shippingCents).toBe(599)

    // The free-shipping threshold for a generated store is $75.
    const large = await shopper.json<Cart>(`/api/storefront/${store.slug}/cart`, post({
      action: 'add', handle: 'three-month-rotating-subscription', quantity: 1,
    }))
    expect(large.totals.subtotalCents).toBeGreaterThanOrEqual(7500)
    expect(large.totals.shippingCents).toBe(0)
  })

  it('updates quantities, removes lines and clears the cart', async () => {
    const { store } = await publishedStore()
    const shopper = client()

    const added = await shopper.json<Cart>(`/api/storefront/${store.slug}/cart`, post({
      action: 'add', handle: 'yirgacheffe-washed', quantity: 1,
    }))
    const line = added.lines[0]!

    const bumped = await shopper.json<Cart>(`/api/storefront/${store.slug}/cart`, post({
      action: 'setQuantity', productId: line.productId, variantId: line.variantId, quantity: 3,
    }))
    expect(bumped.lines[0]!.quantity).toBe(3)
    expect(bumped.totals.subtotalCents).toBe(6300)

    const cleared = await shopper.json<Cart>(`/api/storefront/${store.slug}/cart`, post({ action: 'clear' }))
    expect(cleared.lines).toHaveLength(0)
    expect(cleared.totals.totalCents).toBe(0)
  })

  it('keeps carts separate per shopper', async () => {
    const { store } = await publishedStore()
    const a = client()
    const b = client()

    await a.json(`/api/storefront/${store.slug}/cart`, post({ action: 'add', handle: 'yirgacheffe-washed' }))
    const bCart = await b.json<Cart>(`/api/storefront/${store.slug}/cart`)

    expect(bCart.lines).toHaveLength(0)
  })
})

describe('checkout', () => {
  const address = {
    email: 'buyer@example.com',
    name: 'Jamie Buyer',
    address1: '14 Mill Lane',
    city: 'Portland',
    region: 'OR',
    postal: '97201',
    country: 'United States',
  }

  it('rejects an empty cart, a bad email and a missing address', async () => {
    const { store } = await publishedStore()
    const shopper = client()

    expect(await shopper.status(`/api/storefront/${store.slug}/checkout`, post(address))).toBe(400)

    await shopper.json(`/api/storefront/${store.slug}/cart`, post({ action: 'add', handle: 'yirgacheffe-washed' }))
    expect(await shopper.status(`/api/storefront/${store.slug}/checkout`, post({ ...address, email: 'nope' }))).toBe(400)
    expect(await shopper.status(`/api/storefront/${store.slug}/checkout`, post({ ...address, address1: '' }))).toBe(400)
  })

  it('places an order, clears the cart and decrements inventory', async () => {
    const { merchant, store } = await publishedStore()
    const shopper = client()

    const before = await shopper.json<{ product: { inventory: number } }>(
      `/api/storefront/${store.slug}/product?handle=yirgacheffe-washed`,
    )

    await shopper.json(`/api/storefront/${store.slug}/cart`, post({
      action: 'add', handle: 'yirgacheffe-washed', quantity: 2,
    }))

    const order = await shopper.json<{ orderId: string, number: number, totals: { totalCents: number } }>(
      `/api/storefront/${store.slug}/checkout`, post(address),
    )
    expect(order.number).toBeGreaterThan(1000)
    expect(order.totals.totalCents).toBeGreaterThan(0)

    const emptied = await shopper.json<Cart>(`/api/storefront/${store.slug}/cart`)
    expect(emptied.lines).toHaveLength(0)

    const after = await shopper.json<{ product: { inventory: number } }>(
      `/api/storefront/${store.slug}/product?handle=yirgacheffe-washed`,
    )
    expect(after.product.inventory).toBe(before.product.inventory - 2)

    // And the merchant sees it.
    const orders = await merchant.json<Array<{ id: string, status: string }>>(`/api/stores/${store.id}/orders`)
    expect(orders).toHaveLength(1)
    expect(orders[0]!.status).toBe('paid')
  })

  it('numbers concurrent orders in the same store without collision', async () => {
    const { merchant, store } = await publishedStore()

    const shoppers = await Promise.all([1, 2, 3, 4].map(async () => {
      const s = client()
      await s.json(`/api/storefront/${store.slug}/cart`, post({ action: 'add', handle: 'yirgacheffe-washed' }))
      return s
    }))

    const results = await Promise.all(
      shoppers.map(s => s.json<{ number: number }>(`/api/storefront/${store.slug}/checkout`, post(address))),
    )

    const numbers = results.map(r => r.number)
    expect(new Set(numbers).size).toBe(numbers.length)

    const orders = await merchant.json<unknown[]>(`/api/stores/${store.id}/orders`)
    expect(orders).toHaveLength(4)
  })
})
