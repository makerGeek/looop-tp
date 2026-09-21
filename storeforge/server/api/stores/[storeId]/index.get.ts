import { listChat, listPages, listProducts } from '../../../db/repo'
import { requireStoreAccess } from '../../../utils/store-guard'
import { isAiConfigured } from '../../../ai/agent'
import { usageFor } from '../../../billing/usage'
import { planFor } from '../../../billing/plans'

export default defineEventHandler(async (event) => {
  const { store, role } = await requireStoreAccess(event)

  const [pages, products, messages, usage, plan] = await Promise.all([
    listPages(store.id),
    listProducts(store.id),
    listChat(store.id),
    usageFor(store.orgId),
    planFor(store.orgId),
  ])

  return { store, pages, products, messages, usage, plan, role, aiConfigured: isAiConfigured() }
})
