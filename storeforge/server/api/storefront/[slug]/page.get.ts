import { buildPayload, loadStorefront } from '../../../utils/storefront'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const store = await loadStorefront(event, slug)
  const path = String(getQuery(event).path ?? '/') || '/'
  return buildPayload(store, path)
})
