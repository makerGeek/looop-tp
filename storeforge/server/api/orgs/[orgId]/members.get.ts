import { asc, eq } from 'drizzle-orm'
import { useDb } from '../../../db/index'
import { invitations, memberships, users } from '../../../db/schema'
import { requireOrgAccess } from '../../../utils/store-guard'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const orgId = getRouterParam(event, 'orgId')!
  const { role } = await requireOrgAccess(event, orgId)

  const db = useDb()

  const members = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.orgId, orgId))
    .orderBy(asc(memberships.createdAt))

  const pending = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.orgId, orgId))
    .orderBy(asc(invitations.createdAt))

  return {
    role,
    members: members.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
    // Accepted invitations are kept for the audit trail but aren't "pending".
    invitations: pending.filter(i => i.expiresAt > new Date()).map(i => ({
      ...i,
      expiresAt: i.expiresAt.toISOString(),
    })),
  }
})
