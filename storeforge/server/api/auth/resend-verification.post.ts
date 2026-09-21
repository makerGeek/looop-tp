import { requireUser } from '../../utils/auth'
import { issueToken } from '../../utils/tokens'
import { sendEmail, templates } from '../../email/send'
import { serverConfig } from '../../config'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true }

  const token = await issueToken(user.id, 'verify_email')
  const delivery = await sendEmail({
    to: user.email,
    ...templates.verifyEmail(user.name, `${serverConfig().appUrl}/verify/${token}`),
  })

  return { ok: true, alreadyVerified: false, emailSent: delivery.sent }
})
