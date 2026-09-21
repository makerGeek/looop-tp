import { createUser, findUserByEmail } from '../../db/repo'
import { hashPassword, startSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string, name?: string }>(event)

  const email = (body?.email ?? '').trim().toLowerCase()
  const password = body?.password ?? ''
  const name = (body?.name ?? '').trim() || email.split('@')[0] || 'Merchant'

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
  }
  if (findUserByEmail(email)) {
    throw createError({ statusCode: 409, statusMessage: 'An account with that email already exists' })
  }

  const user = createUser(email, name, hashPassword(password))
  startSession(event, user.id)

  return { id: user.id, email: user.email, name: user.name }
})
