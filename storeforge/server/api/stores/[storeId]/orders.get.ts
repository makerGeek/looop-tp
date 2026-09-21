import { listOrders } from '../../../db/repo'
import { requireStoreAccess } from '../../../utils/store-guard'

export default defineEventHandler(async (event) => {
  const { store } = await requireStoreAccess(event)
  return listOrders(store.id)
})
