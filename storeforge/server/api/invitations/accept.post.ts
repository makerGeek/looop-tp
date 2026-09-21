import { and, eq, gt, isNull } from 'drizzle-orm'
import { useDb } from '../../db/index'
import { invitations, memberships, organizations } from '../../db/schema'
import { currentUser, hashToken } from '../../utils/auth'

/**
 * Accepts an invitation for the signed-in user.
 *
 * The invited address and the signed-in address must match, otherwise a
 * forwarded invite would silently add the wrong account to an organization.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string }>(event)
  const token = (body?.token ?? '').trim()
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Missing invitation token' })

  const db = useDb()

  const [invite] = await db
    .select({
      id: invitations.id,
      orgId: invitations.orgId,
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

  const user = await currentUser(event)
  if (!user) {
    // Let the client route to signup or login with the right address prefilled.
    return { needsAuth: true, email: invite.email, orgName: invite.orgName }
  }

  if (user.email !== invite.email) {
    throw createError({
      statusCode: 403,
      statusMessage: `This invitation is for ${invite.email}. Sign in with that address to accept it.`,
    })
  }

  await db.transaction(async (tx) => {
    await tx.insert(memberships)
      .values({ userId: user.id, orgId: invite.orgId, role: invite.role })
      // Already a member: accepting again is a no-op rather than an error.
      .onConflictDoNothing({ target: [memberships.userId, memberships.orgId] })

    await tx.update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invite.id))
  })

  return { needsAuth: false, orgId: invite.orgId, orgName: invite.orgName, role: invite.role }
})
