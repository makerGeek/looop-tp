import type { H3Event } from 'h3'
import type { StoreRecord } from '#shared/types'
import { getStore } from '../db/repo'
import { requireUser } from './auth'

/**
 * Loads a store and asserts the caller owns it.
 *
 * Returns 404 rather than 403 for someone else's store so the endpoint doesn't
 * confirm that a given store id exists.
 */
export function requireOwnedStore(event: H3Event, storeId?: string): StoreRecord {
  const user = requireUser(event)
  const id = storeId ?? getRouterParam(event, 'storeId')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing store id' })

  const store = getStore(id)
  if (!store || store.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Store not found' })
  }
  return store
}
