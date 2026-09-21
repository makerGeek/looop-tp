import { deleteStore } from '../../../db/repo'
import { requireStoreAccess } from '../../../utils/store-guard'

export default defineEventHandler(async (event) => {
  // Deleting a store takes its products and orders with it, so it needs admin.
  const { store } = await requireStoreAccess(event, 'admin')
  await deleteStore(store.id)
  return { ok: true }
})
