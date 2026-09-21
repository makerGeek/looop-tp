import { serverConfig } from '../config'

/**
 * Transactional email.
 *
 * Without a Resend key, messages are logged instead of sent. That keeps local
 * development and CI working without credentials, and — importantly — the log
 * line carries the link, so an invite or reset can still be completed by hand.
 * It never silently drops mail.
 */
export interface Email {
  to: string
  subject: string
  text: string
}

export async function sendEmail(email: Email): Promise<{ sent: boolean, reason?: string }> {
  const { resendApiKey, emailFrom } = serverConfig()

  if (!resendApiKey) {
    console.info(
      `[email] No NUXT_RESEND_API_KEY set, so this was not sent.\n`
      + `  To:      ${email.to}\n`
      + `  Subject: ${email.subject}\n`
      + `  ${email.text.split('\n').join('\n  ')}`,
    )
    return { sent: false, reason: 'no_api_key' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email.to],
        subject: email.subject,
        text: email.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error(`[email] Resend rejected the message (${response.status}): ${body.slice(0, 300)}`)
      return { sent: false, reason: `resend_${response.status}` }
    }
    return { sent: true }
  }
  catch (err) {
    // A failed send must never fail the request that triggered it — an invite
    // row is already written, and it can be resent.
    console.error('[email] Send failed:', err instanceof Error ? err.message : err)
    return { sent: false, reason: 'network' }
  }
}

/* ------------------------------------------------------------- templates */

export const templates = {
  verifyEmail: (name: string, link: string): Omit<Email, 'to'> => ({
    subject: 'Confirm your StoreForge email',
    text: `Hi ${name},\n\nConfirm your email address to finish setting up StoreForge:\n\n${link}\n\n`
      + `The link is good for 24 hours. If you didn't sign up, you can ignore this.\n`,
  }),

  resetPassword: (name: string, link: string): Omit<Email, 'to'> => ({
    subject: 'Reset your StoreForge password',
    text: `Hi ${name},\n\nUse this link to choose a new password:\n\n${link}\n\n`
      + `The link is good for one hour and can be used once. If you didn't ask for this, `
      + `nothing has changed and you can ignore this email.\n`,
  }),

  invitation: (orgName: string, inviterName: string, link: string): Omit<Email, 'to'> => ({
    subject: `${inviterName} invited you to ${orgName} on StoreForge`,
    text: `${inviterName} has invited you to join ${orgName} on StoreForge.\n\n${link}\n\n`
      + `The invitation expires in 7 days.\n`,
  }),
}
