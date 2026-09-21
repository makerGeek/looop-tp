import { and, eq, gt, isNull } from 'drizzle-orm'
import { useDb } from '../db/index'
import { authTokens } from '../db/schema'
import { newId } from '../db/repo'
import { generateToken, hashToken } from './auth'

export type TokenPurpose = 'verify_email' | 'reset_password'

const TTL_MS: Record<TokenPurpose, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
}

/**
 * Issues a single-use token and returns the raw value for the email link.
 *
 * Only the hash is stored, so the database never holds anything that can be
 * replayed. Existing unused tokens for the same purpose are consumed first, so
 * requesting a second reset link invalidates the first.
 */
export async function issueToken(userId: string, purpose: TokenPurpose): Promise<string> {
  const db = useDb()

  await db.update(authTokens)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(authTokens.userId, userId),
      eq(authTokens.purpose, purpose),
      isNull(authTokens.consumedAt),
    ))

  const token = generateToken()
  await db.insert(authTokens).values({
    id: newId(),
    userId,
    purpose,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TTL_MS[purpose]),
  })

  return token
}

/**
 * Consumes a token, returning the user it belonged to.
 *
 * Marking it consumed in the same statement that selects it means a link cannot
 * be used twice even if it is clicked twice in quick succession.
 */
export async function consumeToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  const rows = await useDb().update(authTokens)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(authTokens.tokenHash, hashToken(token)),
      eq(authTokens.purpose, purpose),
      isNull(authTokens.consumedAt),
      gt(authTokens.expiresAt, new Date()),
    ))
    .returning({ userId: authTokens.userId })

  return rows[0]?.userId ?? null
}
