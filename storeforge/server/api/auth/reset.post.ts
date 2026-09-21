import { eq } from 'drizzle-orm'
import { useDb } from '../../db/index'
import { sessions, users } from '../../db/schema'
import { hashPassword, startSession } from '../../utils/auth'
import { consumeToken } from '../../utils/tokens'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string, password?: string }>(event)
  const token = (body?.token ?? '').trim()
  const password = body?.password ?? ''

  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
  }

  const userId = await consumeToken(token, 'reset_password')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'That reset link is invalid or has expired' })
  }

  const db = useDb()
  await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, userId))

  // A password reset is how someone recovers a compromised account, so every
  // existing session has to go with it.
  await db.delete(sessions).where(eq(sessions.userId, userId))
  await startSession(event, userId)

  return { ok: true }
})
