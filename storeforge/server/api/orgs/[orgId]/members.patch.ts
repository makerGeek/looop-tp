import { and, eq, ne } from 'drizzle-orm'
import { useDb } from '../../../db/index'
import { memberships, type Role } from '../../../db/schema'
import { requireOrgAccess } from '../../../utils/store-guard'

const ROLES: Role[] = ['owner', 'admin', 'member']

export default defineEventHandler(async (event) => {
  const orgId = getRouterParam(event, 'orgId')!
  const { user } = await requireOrgAccess(event, orgId, 'owner')
  const body = await readBody<{ userId?: string, role?: Role }>(event)

  if (!body?.userId || !ROLES.includes(body.role as Role)) {
    throw createError({ statusCode: 400, statusMessage: 'userId and a valid role are required' })
  }

  const db = useDb()

  // An organization must keep at least one owner, or nobody can manage billing
  // or membership ever again.
  if (body.userId === user.id && body.role !== 'owner') {
    const others = await db.select({ userId: memberships.userId }).from(memberships)
      .where(and(
        eq(memberships.orgId, orgId),
        eq(memberships.role, 'owner'),
        ne(memberships.userId, user.id),
      ))

    if (!others.length) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Promote another owner before changing your own role',
      })
    }
  }

  const rows = await db.update(memberships)
    .set({ role: body.role })
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, body.userId)))
    .returning()

  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'That person is not a member' })
  return { ok: true, role: body.role }
})
