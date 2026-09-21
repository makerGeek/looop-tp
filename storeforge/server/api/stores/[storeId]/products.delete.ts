import { deleteProduct } from '../../../db/repo'
import { requireOwnedStore } from '../../../utils/store-guard'

export default defineEventHandler(async (event) => {
  const store = requireOwnedStore(event)
  const { handle } = await readBody<{ handle?: string }>(event) ?? {}
  if (!handle) throw createError({ statusCode: 400, statusMessage: 'handle is required' })

  const removed = deleteProduct(store.id, handle)
  if (!removed) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return { ok: true }
})
