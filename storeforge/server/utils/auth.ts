import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { and, eq, gt } from 'drizzle-orm'
import { useDb } from '../db/index'
import { memberships, organizations, sessions, users } from '../db/schema'
import { newId } from '../db/repo'
import { uniqueSlug } from './slug'

const COOKIE = 'sf_session'
const SESSION_DAYS = 30

export type SessionUser = typeof users.$inferSelect

/* -------------------------------------------------------------- passwords */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false

  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

/** Tokens are stored hashed, so a database leak cannot be replayed as a link. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/* --------------------------------------------------------------- sessions */

export async function startSession(event: H3Event, userId: string): Promise<void> {
  const id = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000)

  await useDb().insert(sessions).values({ id, userId, expiresAt })

  setCookie(event, COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: !import.meta.dev,
    maxAge: SESSION_DAYS * 86_400,
  })
}

export async function endSession(event: H3Event): Promise<void> {
  const id = getCookie(event, COOKIE)
  if (id) await useDb().delete(sessions).where(eq(sessions.id, id))
  deleteCookie(event, COOKIE, { path: '/' })
}

/** The signed-in user, or null for anonymous requests. */
export async function currentUser(event: H3Event): Promise<SessionUser | null> {
  const id = getCookie(event, COOKIE)
  if (!id) return null

  const [row] = await useDb()
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1)

  return row?.user ?? null
}

export async function requireUser(event: H3Event): Promise<SessionUser> {
  const user = await currentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to continue' })
  return user
}

/* --------------------------------------------------------- registration */

/**
 * Creates a user together with their personal organization.
 *
 * Every user is always in at least one org, so no code path has to handle an
 * orgless account. Run in a transaction — a user without a membership would be
 * locked out of their own stores.
 */
export async function registerUser(
  email: string,
  name: string,
  password: string,
): Promise<{ user: SessionUser, orgId: string }> {
  const db = useDb()
  const normalized = email.toLowerCase().trim()

  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      id: newId(),
      email: normalized,
      name,
      passwordHash: hashPassword(password),
    }).returning()

    const orgName = `${name}'s workspace`
    const slug = await uniqueSlug(orgName, async candidate => {
      const [row] = await tx.select({ id: organizations.id }).from(organizations)
        .where(eq(organizations.slug, candidate)).limit(1)
      return !!row
    })

    const [org] = await tx.insert(organizations).values({
      id: newId(),
      name: orgName,
      slug,
    }).returning()

    await tx.insert(memberships).values({
      userId: user!.id,
      orgId: org!.id,
      role: 'owner',
    })

    return { user: user!, orgId: org!.id }
  })
}

export async function findUserByEmail(email: string): Promise<SessionUser | undefined> {
  const [row] = await useDb().select().from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1)
  return row
}
