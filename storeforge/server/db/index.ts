import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { SCHEMA_SQL } from './schema'

let db: Database.Database | null = null

/**
 * Opens (and on first call, migrates) the SQLite database.
 *
 * SQLite keeps the whole product to a single file with no external service,
 * which is what makes `npm run dev` enough to get a working store builder.
 */
export function useDb(): Database.Database {
  if (db) return db

  const config = useRuntimeConfig()
  const file = resolve(process.cwd(), config.databasePath)
  mkdirSync(dirname(file), { recursive: true })

  db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)

  return db
}

/** Parse a JSON column, falling back rather than throwing on legacy/corrupt rows. */
export function json<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  }
  catch {
    return fallback
  }
}
