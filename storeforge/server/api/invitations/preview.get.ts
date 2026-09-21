import { and, eq, gt, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index'
import { invitations, organizations } from '../../db/schema'
import { hashToken } from '../../utils/auth'

/** Enough to render the invite screen before the recipient has an account. */
export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token ?? '')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Missing invitation token' })

  const [invite] = await useDb()
    .select({
      email: invitations.email,
      role: invitations.role,
      orgName: organizations.name,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.orgId))
    .where(and(
      eq(invitations.tokenHash, hashToken(token)),
      isNull(invitations.acceptedAt),
      gt(invitations.expiresAt, new Date()),
    ))
    .limit(1)

  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'That invitation is invalid or has expired' })
  }
  return invite
})
