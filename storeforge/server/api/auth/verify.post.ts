import { eq } from 'drizzle-orm'
import { useDb } from '../../db/index'
import { users } from '../../db/schema'
import { consumeToken } from '../../utils/tokens'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string }>(event)

  const userId = await consumeToken((body?.token ?? '').trim(), 'verify_email')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'That confirmation link is invalid or has expired' })
  }

  await useDb().update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId))
  return { ok: true }
})
