import { listOrgsForUser, listProducts, listStoresForOrg } from '../../db/repo'
import { requireUser } from '../../utils/auth'

/**
 * Every store the caller can reach, across all their organizations.
 *
 * Product counts are fetched in parallel — a merchant with a dozen stores would
 * otherwise pay a serial round trip per store.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const orgs = await listOrgsForUser(user.id)

  const perOrg = await Promise.all(
    orgs.map(async (org) => {
      const stores = await listStoresForOrg(org.orgId)
      return Promise.all(stores.map(async store => ({
        ...store,
        orgName: org.orgName,
        role: org.role,
        productCount: (await listProducts(store.id)).length,
      })))
    }),
  )

  return perOrg.flat()
})
