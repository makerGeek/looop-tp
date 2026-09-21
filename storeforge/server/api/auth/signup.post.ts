import { findUserByEmail, registerUser, startSession } from '../../utils/auth'
import { issueToken } from '../../utils/tokens'
import { sendEmail, templates } from '../../email/send'
import { serverConfig } from '../../config'
import { clientIp, enforceRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, `signup:${clientIp(event)}`, {
    limit: 10,
    windowSeconds: 3600,
    message: 'Too many accounts created from this network. Try again later.',
  })

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
  if (await findUserByEmail(email)) {
    throw createError({ statusCode: 409, statusMessage: 'An account with that email already exists' })
  }

  const { user, orgId } = await registerUser(email, name, password)
  await startSession(event, user.id)

  // Verification is not a gate on using the product — it only unlocks actions
  // that email someone else. A failed send must not fail the signup.
  const token = await issueToken(user.id, 'verify_email')
  await sendEmail({
    to: user.email,
    ...templates.verifyEmail(user.name, `${serverConfig().appUrl}/verify/${token}`),
  })

  return { id: user.id, email: user.email, name: user.name, orgId }
})
