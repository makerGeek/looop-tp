import { getProduct, listProducts } from '../../../db/repo'
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

  return {
    store: { name: store.name, slug: store.slug, brand: store.brand, theme: store.theme, settings: store.settings },
    product,
    related,
  }
})
