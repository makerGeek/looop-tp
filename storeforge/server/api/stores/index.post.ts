import { createStore, countStoresForOrg, listOrgsForUser, slugExists } from '../../db/repo'
import { requireUser } from '../../utils/auth'
import { requireOrgAccess } from '../../utils/store-guard'
import { uniqueSlug } from '../../utils/slug'
import { planFor, storeLimitFor } from '../../billing/plans'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ name?: string, orgId?: string }>(event)

  // Default to the caller's first organization when none is named.
  const orgs = await listOrgsForUser(user.id)
  const orgId = body?.orgId ?? orgs[0]?.orgId
  if (!orgId) throw createError({ statusCode: 400, statusMessage: 'No organization available' })

  await requireOrgAccess(event, orgId, 'admin')

  const name = (body?.name ?? '').trim() || 'Untitled store'
  if (name.length > 60) {
    throw createError({ statusCode: 400, statusMessage: 'Store name is too long' })
  }

  // Plan limits are enforced here rather than in the UI, which can be bypassed.
  const [existing, plan] = await Promise.all([countStoresForOrg(orgId), planFor(orgId)])
  const limit = storeLimitFor(plan)
  if (existing >= limit) {
    throw createError({
      statusCode: 402,
      statusMessage: `The ${plan} plan includes ${limit} store${limit === 1 ? '' : 's'}. Upgrade to add more.`,
    })
  }

  const slug = await uniqueSlug(name, slugExists)
  return createStore(orgId, name, slug)
})
