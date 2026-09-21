import { findUserByEmail } from '../../db/repo'
import { startSession, verifyPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string }>(event)
  const email = (body?.email ?? '').trim().toLowerCase()
  const password = body?.password ?? ''

  const user = findUserByEmail(email)
  // Same message either way so this can't be used to enumerate accounts.
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw createError({ statusCode: 401, statusMessage: 'Email or password is incorrect' })
  }

  startSession(event, user.id)
  return { id: user.id, email: user.email, name: user.name }
})
