import { deleteStore } from '../../../db/repo'
import { requireOwnedStore } from '../../../utils/store-guard'

export default defineEventHandler((event) => {
  const store = requireOwnedStore(event)
  deleteStore(store.id)
  return { ok: true }
})
