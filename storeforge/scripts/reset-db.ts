/** Drops and recreates the public schema, then re-applies migrations. */
import postgres from 'postgres'

const url = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL
if (!url) {
  console.error('Set NUXT_DATABASE_URL (or DATABASE_URL) before resetting.')
  process.exit(1)
}
if (process.env.NODE_ENV === 'production' && !process.env.I_MEAN_IT) {
  console.error('Refusing to reset a production database. Set I_MEAN_IT=1 to override.')
  process.exit(1)
}

const client = postgres(url, { max: 1, onnotice: () => {} })

// Drizzle's migration journal lives in its own `drizzle` schema. Leaving it
// behind would make the migrator skip everything on the next run.
await client.unsafe(
  'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;',
)
await client.end()
console.log('Schema dropped. Run `npm run db:migrate` to rebuild it.')
