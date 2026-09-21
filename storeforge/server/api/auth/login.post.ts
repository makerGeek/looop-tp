import { findUserByEmail, startSession, verifyPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string }>(event)
  const email = (body?.email ?? '').trim().toLowerCase()
  const password = body?.password ?? ''

  const user = await findUserByEmail(email)
  // Same message either way, so this can't be used to enumerate accounts.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw createError({ statusCode: 401, statusMessage: 'Email or password is incorrect' })
  }

  await startSession(event, user.id)
  return { id: user.id, email: user.email, name: user.name }
})
