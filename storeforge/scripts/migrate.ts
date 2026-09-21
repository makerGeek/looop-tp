/**
 * Applies pending migrations.
 *
 * Kept as a standalone script rather than running on boot: an app instance
 * migrating at startup races every other instance during a rolling deploy.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL
if (!url) {
  console.error('Set NUXT_DATABASE_URL (or DATABASE_URL) before running migrations.')
  process.exit(1)
}

// A dedicated single connection: migrations are serial and short-lived.
const client = postgres(url, { max: 1 })

try {
  await migrate(drizzle(client), { migrationsFolder: './server/db/migrations' })
  console.log('Migrations applied.')
}
catch (error) {
  console.error('Migration failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
}
finally {
  await client.end()
}
