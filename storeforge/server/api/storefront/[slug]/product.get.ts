import { getProduct, listProducts } from '../../../db/repo'
import { loadStorefront, storeNav } from '../../../utils/storefront'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const store = await loadStorefront(event, slug)
  const handle = String(getQuery(event).handle ?? '')

  const product = await getProduct(store.id, handle)
  if (!product || product.status !== 'active') {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  const [all, nav] = await Promise.all([
    listProducts(store.id, { activeOnly: true }),
    storeNav(store.id),
  ])

  const related = all
    .filter(p => p.handle !== handle && (!product.collection || p.collection === product.collection))
    .slice(0, 4)

  return {
    store: { name: store.name, slug: store.slug, brand: store.brand, theme: store.theme, settings: store.settings },
    product,
    related,
    nav,
  }
})
