import { getOrder } from '../../../db/repo'
import { loadStorefront } from '../../../utils/storefront'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')!
  const store = loadStorefront(event, slug)
  const id = String(getQuery(event).id ?? '')

  const order = getOrder(store.id, id)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  return {
    store: { name: store.name, slug: store.slug, brand: store.brand, theme: store.theme },
    order,
  }
})
