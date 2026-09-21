import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db/index'
import { invitations, memberships, organizations, users, type Role } from '../../../db/schema'
import { newId } from '../../../db/repo'
import { requireOrgAccess } from '../../../utils/store-guard'
import { generateToken, hashToken } from '../../../utils/auth'
import { sendEmail, templates } from '../../../email/send'
import { serverConfig } from '../../../config'

const ROLES: Role[] = ['admin', 'member']
const TTL_MS = 7 * 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const orgId = getRouterParam(event, 'orgId')!
  const { user } = await requireOrgAccess(event, orgId, 'admin')
  const body = await readBody<{ email?: string, role?: Role }>(event)

  const email = (body?.email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address' })
  }

  // Only owners can mint another owner, and that happens through a transfer,
  // not an invitation.
  const role: Role = ROLES.includes(body?.role as Role) ? body!.role! : 'member'

  const db = useDb()

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.orgId, orgId)))
    .where(eq(users.email, email))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'That person is already a member' })
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + TTL_MS)

  // Re-inviting the same address replaces the outstanding invitation rather
  // than failing, so a lost email is trivially recoverable.
  await db.insert(invitations).values({
    id: newId(),
    orgId,
    email,
    role,
    tokenHash: hashToken(token),
    invitedBy: user.id,
    expiresAt,
  }).onConflictDoUpdate({
    target: [invitations.orgId, invitations.email],
    set: { role, tokenHash: hashToken(token), expiresAt, acceptedAt: null, invitedBy: user.id },
  })

  const [org] = await db.select({ name: organizations.name }).from(organizations)
    .where(eq(organizations.id, orgId)).limit(1)

  const link = `${serverConfig().appUrl}/invite/${token}`
  const delivery = await sendEmail({
    to: email,
    ...templates.invitation(org?.name ?? 'a workspace', user.name, link),
  })

  return {
    ok: true,
    email,
    role,
    emailSent: delivery.sent,
    // Surfaced so the UI can show a copyable link when mail isn't configured,
    // rather than leaving the inviter wondering why nothing arrived.
    inviteLink: delivery.sent ? undefined : link,
  }
})
