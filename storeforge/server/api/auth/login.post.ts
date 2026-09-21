import { findUserByEmail, startSession, verifyPassword } from '../../utils/auth'
import { clientIp, enforceRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string }>(event)
  const email = (body?.email ?? '').trim().toLowerCase()
  const password = body?.password ?? ''

  // Limited per address as well as per IP: one stops a distributed attack on a
  // single account, the other stops one host spraying many accounts.
  await enforceRateLimit(event, `login:ip:${clientIp(event)}`, {
    limit: 20,
    windowSeconds: 300,
    message: 'Too many sign-in attempts from this network. Try again shortly.',
  })
  if (email) {
    await enforceRateLimit(event, `login:email:${email}`, {
      limit: 10,
      windowSeconds: 900,
      message: 'Too many sign-in attempts for this account. Try again shortly.',
    })
  }

  const user = await findUserByEmail(email)
  // Same message either way, so this can't be used to enumerate accounts.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw createError({ statusCode: 401, statusMessage: 'Email or password is incorrect' })
  }

  await startSession(event, user.id)
  return { id: user.id, email: user.email, name: user.name }
})
