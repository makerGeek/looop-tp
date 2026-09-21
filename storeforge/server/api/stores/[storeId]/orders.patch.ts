import type { OrderStatus } from '#shared/types'
import { setOrderStatus } from '../../../db/repo'
import { requireOwnedStore } from '../../../utils/store-guard'

const ALLOWED: OrderStatus[] = ['paid', 'fulfilled', 'refunded', 'cancelled']

export default defineEventHandler(async (event) => {
  const store = requireOwnedStore(event)
  const body = await readBody<{ orderId?: string, status?: OrderStatus }>(event)

  if (!body?.orderId || !body.status || !ALLOWED.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'orderId and a valid status are required' })
  }

  const order = setOrderStatus(store.id, body.orderId, body.status)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  return order
})
