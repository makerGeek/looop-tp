import type { StoreRecord } from '#shared/types'
import { updateStore } from '../../../db/repo'
import { requireStoreAccess } from '../../../utils/store-guard'

export default defineEventHandler(async (event) => {
  const { store } = await requireStoreAccess(event)
  const body = await readBody<Partial<Pick<StoreRecord, 'name' | 'status' | 'brand' | 'theme' | 'settings'>>>(event)

  const patch: Partial<Pick<StoreRecord, 'name' | 'status' | 'brand' | 'theme' | 'settings'>> = {}
  if (typeof body?.name === 'string' && body.name.trim()) patch.name = body.name.trim()
  if (body?.status === 'draft' || body?.status === 'published') patch.status = body.status
  if (body?.brand && typeof body.brand === 'object') patch.brand = { ...store.brand, ...body.brand }
  if (body?.theme && typeof body.theme === 'object') patch.theme = { ...store.theme, ...body.theme }
  if (body?.settings && typeof body.settings === 'object') patch.settings = { ...store.settings, ...body.settings }

  return updateStore(store.id, patch)
})
