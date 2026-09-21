import type { H3Event } from 'h3'
import type { StorefrontPayload, StoreRecord } from '#shared/types'
import { getMembership, getPage, getStoreBySlug, listPages, listProducts } from '../db/repo'
import { currentUser } from './auth'

/**
 * Loads a storefront by slug.
 *
 * A draft store stays visible to anyone in its organization so the whole team
 * can preview before launch, and 404s for everyone else.
 */
export async function loadStorefront(event: H3Event, slug: string): Promise<StoreRecord> {
  const store = await getStoreBySlug(slug)
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  if (store.status !== 'published') {
    const user = await currentUser(event)
    const role = user ? await getMembership(user.id, store.orgId) : undefined
    if (!role) {
      throw createError({ statusCode: 404, statusMessage: 'This store is not published yet' })
    }
  }
  return store
}

export async function buildPayload(store: StoreRecord, path: string): Promise<StorefrontPayload> {
  const page = await getPage(store.id, path)
  if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

  const all = await listPages(store.id)
  const nav = all
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
    products: await listProducts(store.id, { activeOnly: true }),
  }
}

/** The nav alone, for pages that render chrome without a page document. */
export async function storeNav(storeId: string): Promise<Array<{ label: string, href: string }>> {
  const all = await listPages(storeId)
  return all
    .filter(p => p.navLabel)
    .sort((a, b) => a.navOrder - b.navOrder)
    .map(p => ({ label: p.navLabel!, href: p.path }))
}
