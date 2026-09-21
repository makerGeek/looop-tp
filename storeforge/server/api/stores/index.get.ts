import { listProducts, listStores } from '../../db/repo'
import { requireUser } from '../../utils/auth'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  return listStores(user.id).map(store => ({
    ...store,
    productCount: listProducts(store.id).length,
  }))
})
