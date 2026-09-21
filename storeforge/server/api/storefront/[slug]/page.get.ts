import { loadStorefront, buildPayload } from '../../../utils/storefront'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')!
  const store = loadStorefront(event, slug)
  const path = String(getQuery(event).path ?? '/') || '/'
  return buildPayload(store, path)
})
