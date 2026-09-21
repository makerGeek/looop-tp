import { listOrders } from '../../../db/repo'
import { requireOwnedStore } from '../../../utils/store-guard'

export default defineEventHandler((event) => {
  const store = requireOwnedStore(event)
  return listOrders(store.id)
})
