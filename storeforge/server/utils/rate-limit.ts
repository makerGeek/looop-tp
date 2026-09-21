import type { H3Event } from 'h3'
import { lt, sql } from 'drizzle-orm'
import { useDb } from '../db/index'
import { rateLimits } from '../db/schema'

/**
 * A fixed-window rate limiter backed by Postgres.
 *
 * Postgres rather than an in-memory map because more than one instance runs in
 * production, and a per-process counter would multiply the real limit by the
 * instance count. Redis would be faster; this is on auth routes only, where the
 * traffic is low and correctness matters more than microseconds. Swap the
 * implementation here if the hot path ever needs it.
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export async function rateLimit(
  key: string,
  options: { limit: number, windowSeconds: number },
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = options.windowSeconds * 1000
  // Align windows so every caller in the same period shares a bucket.
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs)

  const [row] = await useDb()
    .insert(rateLimits)
    .values({ key, windowStart, hits: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { hits: sql`${rateLimits.hits} + 1` },
    })
    .returning({ hits: rateLimits.hits })

  const hits = row?.hits ?? 1
  const resetAt = windowStart.getTime() + windowMs

  return {
    allowed: hits <= options.limit,
    remaining: Math.max(0, options.limit - hits),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  }
}

/**
 * The caller's IP, as far as it can be trusted.
 *
 * A caller can put anything in `x-forwarded-for`, and a proxy *appends* rather
 * than replaces — so the leftmost entry is attacker-controlled and using it
 * would let anyone bypass every limit here by sending a fresh fake IP each
 * request. The rightmost entry is the one the nearest proxy added, which is its
 * own view of the connecting client, so that is what we take.
 *
 * Platform headers are preferred where present: they are set by the edge and
 * cannot be forged by the client.
 */
export function clientIp(event: H3Event): string {
  const platform = getHeader(event, 'fly-client-ip')
    ?? getHeader(event, 'cf-connecting-ip')
    ?? getHeader(event, 'x-real-ip')
  if (platform) return platform.trim()

  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    const hops = forwarded.split(',').map(h => h.trim()).filter(Boolean)
    const nearest = hops.at(-1)
    if (nearest) return nearest
  }

  return event.node.req.socket.remoteAddress ?? 'unknown'
}

/** Applies a limit and throws a 429 with Retry-After when it is exceeded. */
export async function enforceRateLimit(
  event: H3Event,
  key: string,
  options: { limit: number, windowSeconds: number, message?: string },
): Promise<void> {
  const result = await rateLimit(key, options)

  setHeader(event, 'X-RateLimit-Limit', String(options.limit))
  setHeader(event, 'X-RateLimit-Remaining', String(result.remaining))

  if (!result.allowed) {
    setHeader(event, 'Retry-After', result.retryAfterSeconds)
    throw createError({
      statusCode: 429,
      statusMessage: options.message
        ?? `Too many attempts. Try again in ${result.retryAfterSeconds} seconds.`,
    })
  }
}

/** Drops windows that can no longer be hit, so the table stays small. */
export async function pruneRateLimits(olderThanMs = 24 * 60 * 60 * 1000): Promise<number> {
  const removed = await useDb().delete(rateLimits)
    .where(lt(rateLimits.windowStart, new Date(Date.now() - olderThanMs)))
    .returning({ key: rateLimits.key })
  return removed.length
}
