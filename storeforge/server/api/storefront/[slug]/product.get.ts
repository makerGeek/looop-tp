import { getProduct, listPages, listProducts } from '../../../db/repo'
import { loadStorefront } from '../../../utils/storefront'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')!
  const store = loadStorefront(event, slug)
  const handle = String(getQuery(event).handle ?? '')

  const product = getProduct(store.id, handle)
  if (!product || product.status !== 'active') {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  const related = listProducts(store.id, { activeOnly: true })
    .filter(p => p.handle !== handle && (!product.collection || p.collection === product.collection))
    .slice(0, 4)

  // The product page renders the same chrome as every other page, so it needs
  // the nav too — otherwise a shopper who lands here has no way back.
  const nav = listPages(store.id)
    .filter(page => page.navLabel)
    .sort((a, b) => a.navOrder - b.navOrder)
    .map(page => ({ label: page.navLabel!, href: page.path }))

  return {
    store: { name: store.name, slug: store.slug, brand: store.brand, theme: store.theme, settings: store.settings },
    product,
    related,
    nav,
  }
})
