import { findUserByEmail } from '../../utils/auth'
import { issueToken } from '../../utils/tokens'
import { sendEmail, templates } from '../../email/send'
import { serverConfig } from '../../config'
import { clientIp, enforceRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  // Reset requests send mail, so they are a spam vector as well as a probe.
  await enforceRateLimit(event, `reset:${clientIp(event)}`, {
    limit: 10,
    windowSeconds: 3600,
    message: 'Too many reset requests. Try again later.',
  })

  const body = await readBody<{ email?: string }>(event)
  const email = (body?.email ?? '').trim().toLowerCase()

  const user = await findUserByEmail(email)

  // Always the same response. Telling an anonymous caller whether an address is
  // registered would turn this into an account-enumeration oracle.
  if (user) {
    const token = await issueToken(user.id, 'reset_password')
    await sendEmail({
      to: user.email,
      ...templates.resetPassword(user.name, `${serverConfig().appUrl}/reset/${token}`),
    })
  }

  return { ok: true, message: 'If that address has an account, a reset link is on its way.' }
})
