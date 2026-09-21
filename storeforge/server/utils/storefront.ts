import type { H3Event } from 'h3'
import type { StorefrontPayload, StoreRecord } from '#shared/types'
import { getPage, getStoreBySlug, listPages, listProducts } from '../db/repo'
import { currentUser } from './auth'

/**
 * Loads a storefront by slug.
 *
 * A draft store stays visible to its owner so they can preview before going
 * live, and 404s for everyone else.
 */
export function loadStorefront(event: H3Event, slug: string): StoreRecord {
  const store = getStoreBySlug(slug)
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  if (store.status !== 'published') {
    const user = currentUser(event)
    if (!user || user.id !== store.userId) {
      throw createError({ statusCode: 404, statusMessage: 'This store is not published yet' })
    }
  }
  return store
}

export function buildPayload(store: StoreRecord, path: string): StorefrontPayload {
  const page = getPage(store.id, path)
  if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

  const nav = listPages(store.id)
    .filter(p => p.navLabel)
    .sort((a, b) => a.navOrder - b.navOrder)
    .map(p => ({ label: p.navLabel!, href: p.path }))

  return {
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      status: store.status,
      brand: store.brand,
      theme: store.theme,
      settings: store.settings,
    },
    page,
    nav,
    products: listProducts(store.id, { activeOnly: true }),
  }
}
