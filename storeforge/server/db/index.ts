import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { serverConfig } from '../config'

let client: ReturnType<typeof postgres> | null = null
let database: ReturnType<typeof drizzle<typeof schema>> | null = null

/**
 * The shared Drizzle connection.
 *
 * Nitro reuses the module across requests, so the pool is created once. Keep
 * `max` modest: serverless Postgres providers cap connections far below what a
 * default pool would open.
 */
export function useDb() {
  if (database) return database

  const { databaseUrl } = serverConfig()
  client = postgres(databaseUrl, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    // postgres.js parses these into JS Dates; Drizzle's jsonb typing handles the rest.
    transform: { undefined: null },
  })
  database = drizzle(client, { schema })
  return database
}

/** Closes the pool. Used by tests and by graceful shutdown. */
export async function closeDb(): Promise<void> {
  await client?.end({ timeout: 5 })
  client = null
  database = null
}

export { schema }
export type Database = ReturnType<typeof useDb>
