import { parseMoney } from '#shared/money'
import { upsertProduct } from '../../../db/repo'
import { requireStoreAccess } from '../../../utils/store-guard'
import { artworkUrl } from '../../../utils/artwork'
import { slugify } from '../../../utils/slug'

/** Manual product editing from the admin, alongside whatever the AI built. */
export default defineEventHandler(async (event) => {
  const { store } = await requireStoreAccess(event)
  const body = await readBody<{
    handle?: string, title?: string, description?: string,
    price?: string | number, compareAtPrice?: string | number | null,
    inventory?: number, status?: 'active' | 'draft', collection?: string | null
  }>(event)

  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Title is required' })

  const handle = slugify(body?.handle || title)
  const priceCents = parseMoney(body?.price ?? 0)
  if (priceCents <= 0) throw createError({ statusCode: 400, statusMessage: 'Price must be greater than zero' })

  const compare = body?.compareAtPrice != null ? parseMoney(body.compareAtPrice) : null

  return upsertProduct(store.id, {
    handle,
    title,
    description: body?.description ?? '',
    priceCents,
    compareAtCents: compare && compare > priceCents ? compare : null,
    image: artworkUrl(`${store.id}:${handle}`, title, 'product'),
    status: body?.status === 'draft' ? 'draft' : 'active',
    inventory: Number.isFinite(body?.inventory) ? Number(body!.inventory) : 100,
    collection: body?.collection ?? null,
  })
})
