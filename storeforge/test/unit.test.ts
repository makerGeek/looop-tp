import { describe, expect, it } from 'vitest'
import { computeTotals, buildLine, mergeLine } from '../server/utils/commerce'
import { slugify } from '../server/utils/slug'
import { formatMoney, parseMoney } from '../shared/money'
import { renderArtwork } from '../server/utils/artwork'
import type { ProductRecord, StoreSettings } from '../shared/types'

const settings: StoreSettings = {
  currency: 'USD',
  shippingFlatCents: 599,
  freeShippingThresholdCents: 7500,
  taxRateBps: 850,
  footerLinks: [],
  socialLinks: [],
}

const product = (over: Partial<ProductRecord> = {}): ProductRecord => ({
  id: 'p1', storeId: 's1', handle: 'mug', title: 'Mug', description: '',
  priceCents: 2000, compareAtCents: null, image: null, status: 'active',
  inventory: 10, tags: [], collection: null, createdAt: '', variants: [], ...over,
})

describe('totals', () => {
  it('is zero for an empty cart, with no shipping charged', () => {
    expect(computeTotals([], settings)).toEqual({
      subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0,
    })
  })

  it('adds flat shipping and rounds tax to the nearest cent', () => {
    const totals = computeTotals([buildLine(product(), null, 1)], settings)
    expect(totals.subtotalCents).toBe(2000)
    expect(totals.shippingCents).toBe(599)
    expect(totals.taxCents).toBe(170) // 8.5% of 2000
    expect(totals.totalCents).toBe(2769)
  })

  it('waives shipping at exactly the threshold', () => {
    const totals = computeTotals([buildLine(product({ priceCents: 7500 }), null, 1)], settings)
    expect(totals.shippingCents).toBe(0)
  })

  it('takes the variant price over the product price', () => {
    const withVariant = product({
      variants: [{ id: 'v1', productId: 'p1', title: 'Large', priceCents: 3000, sku: null, inventory: 5 }],
    })
    expect(buildLine(withVariant, 'v1', 1).unitPriceCents).toBe(3000)
    expect(buildLine(withVariant, null, 1).unitPriceCents).toBe(2000)
  })

  it('clamps quantity into a sane range', () => {
    expect(buildLine(product(), null, 0).quantity).toBe(1)
    expect(buildLine(product(), null, -5).quantity).toBe(1)
    expect(buildLine(product(), null, 5000).quantity).toBe(99)
  })

  it('merges a repeat add into the existing line', () => {
    const first = buildLine(product(), null, 2)
    const merged = mergeLine([first], buildLine(product(), null, 3))
    expect(merged).toHaveLength(1)
    expect(merged[0]!.quantity).toBe(5)
  })

  it('keeps different variants of one product as separate lines', () => {
    const withVariants = product({
      variants: [
        { id: 'v1', productId: 'p1', title: 'S', priceCents: null, sku: null, inventory: 5 },
        { id: 'v2', productId: 'p1', title: 'L', priceCents: null, sku: null, inventory: 5 },
      ],
    })
    const lines = mergeLine([buildLine(withVariants, 'v1', 1)], buildLine(withVariants, 'v2', 1))
    expect(lines).toHaveLength(2)
  })
})

describe('money', () => {
  it('parses decimals, currency symbols and separators into cents', () => {
    expect(parseMoney('19.99')).toBe(1999)
    expect(parseMoney('$24')).toBe(2400)
    expect(parseMoney(18)).toBe(1800)
    expect(parseMoney('not a price')).toBe(0)
  })

  it('drops trailing zeros on whole amounts', () => {
    expect(formatMoney(2100, 'USD')).toBe('$21')
    expect(formatMoney(2150, 'USD')).toBe('$21.50')
  })
})

describe('slugify', () => {
  it('normalises accents, punctuation and spacing', () => {
    expect(slugify('Café Crème!')).toBe('cafe-creme')
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces')
    expect(slugify('')).toBe('store')
  })
})

describe('artwork', () => {
  it('is deterministic per seed and escapes the label', () => {
    const a = renderArtwork({ seed: 'x', label: 'Mug' })
    const b = renderArtwork({ seed: 'x', label: 'Mug' })
    expect(a).toBe(b)
    expect(renderArtwork({ seed: 'y', label: 'Mug' })).not.toBe(a)

    const escaped = renderArtwork({ seed: 'x', label: '<script>alert(1)</script>' })
    expect(escaped).not.toContain('<script>')
    expect(escaped).toContain('&lt;script&gt;')
  })
})
