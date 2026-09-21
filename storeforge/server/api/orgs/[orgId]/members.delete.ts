import { and, eq, ne } from 'drizzle-orm'
import { useDb } from '../../../db/index'
import { invitations, memberships } from '../../../db/schema'
import { requireOrgAccess } from '../../../utils/store-guard'

export default defineEventHandler(async (event) => {
  const orgId = getRouterParam(event, 'orgId')!
  const { user } = await requireOrgAccess(event, orgId, 'admin')
  const body = await readBody<{ userId?: string, invitationId?: string }>(event)

  const db = useDb()

  // Revoking an invitation is the same action from the UI's point of view.
  if (body?.invitationId) {
    await db.delete(invitations)
      .where(and(eq(invitations.orgId, orgId), eq(invitations.id, body.invitationId)))
    return { ok: true }
  }

  if (!body?.userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId or invitationId is required' })
  }

  const [target] = await db.select({ role: memberships.role }).from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, body.userId)))
    .limit(1)

  if (!target) throw createError({ statusCode: 404, statusMessage: 'That person is not a member' })

  // Removing an owner needs owner rank, and never the last one.
  if (target.role === 'owner') {
    const { role } = await requireOrgAccess(event, orgId, 'owner')
    void role

    const others = await db.select({ userId: memberships.userId }).from(memberships)
      .where(and(
        eq(memberships.orgId, orgId),
        eq(memberships.role, 'owner'),
        ne(memberships.userId, body.userId),
      ))

    if (!others.length) {
      throw createError({
        statusCode: 409,
        statusMessage: 'An organization needs at least one owner',
      })
    }
  }

  await db.delete(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, body.userId)))

  return { ok: true, removedSelf: body.userId === user.id }
})
