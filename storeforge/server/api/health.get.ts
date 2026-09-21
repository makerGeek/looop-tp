import { sql } from 'drizzle-orm'
import { useDb } from '../db/index'

/**
 * Liveness plus a real dependency check.
 *
 * A health endpoint that only proves the process is up will happily report
 * green while every request fails on a dead database, so this touches Postgres.
 */
export default defineEventHandler(async (event) => {
  const startedAt = Date.now()

  try {
    await useDb().execute(sql`select 1`)
  }
  catch (err) {
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      database: 'unreachable',
      error: err instanceof Error ? err.message : 'unknown',
    }
  }

  return { status: 'ok', database: 'ok', latencyMs: Date.now() - startedAt }
})
