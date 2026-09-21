import type { H3Event } from 'h3'
import type { StoreRecord } from '#shared/types'
import type { Role } from '../db/schema'
import { getMembership, getStore } from '../db/repo'
import { requireUser, type SessionUser } from './auth'

const RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 }

export interface StoreAccess {
  store: StoreRecord
  user: SessionUser
  role: Role
}

/**
 * Loads a store and asserts the caller has at least `minRole` in its org.
 *
 * Returns 404 rather than 403 for a store the caller cannot see, so the endpoint
 * never confirms that a given store id exists. An insufficient role on a store
 * they *can* see is a 403, because hiding that would be confusing rather than
 * protective.
 */
export async function requireStoreAccess(
  event: H3Event,
  minRole: Role = 'member',
  storeId?: string,
): Promise<StoreAccess> {
  const user = await requireUser(event)
  const id = storeId ?? getRouterParam(event, 'storeId')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing store id' })

  const store = await getStore(id)
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const role = await getMembership(user.id, store.orgId)
  if (!role) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  if (RANK[role] < RANK[minRole]) {
    throw createError({
      statusCode: 403,
      statusMessage: `This action needs the ${minRole} role`,
    })
  }

  return { store, user, role }
}

/** Asserts membership of an organization directly, for non-store routes. */
export async function requireOrgAccess(
  event: H3Event,
  orgId: string,
  minRole: Role = 'member',
): Promise<{ user: SessionUser, role: Role }> {
  const user = await requireUser(event)

  const role = await getMembership(user.id, orgId)
  if (!role) throw createError({ statusCode: 404, statusMessage: 'Organization not found' })

  if (RANK[role] < RANK[minRole]) {
    throw createError({
      statusCode: 403,
      statusMessage: `This action needs the ${minRole} role`,
    })
  }

  return { user, role }
}
