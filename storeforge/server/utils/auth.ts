import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { createSession, deleteSession, findSessionUser, type UserRow } from '../db/repo'

const COOKIE = 'sf_session'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

export function startSession(event: H3Event, userId: string): void {
  const id = createSession(userId)
  setCookie(event, COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: !import.meta.dev,
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function endSession(event: H3Event): void {
  const id = getCookie(event, COOKIE)
  if (id) deleteSession(id)
  deleteCookie(event, COOKIE, { path: '/' })
}

/** Returns the signed-in user, or null for anonymous requests. */
export function currentUser(event: H3Event): UserRow | null {
  const id = getCookie(event, COOKIE)
  if (!id) return null
  return findSessionUser(id) ?? null
}

/** Returns the signed-in user or throws a 401. */
export function requireUser(event: H3Event): UserRow {
  const user = currentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to continue' })
  }
  return user
}
