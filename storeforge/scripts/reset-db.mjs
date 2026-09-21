/** Deletes the SQLite database so the next boot starts from an empty schema. */
import { existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = resolve(root, process.env.DATABASE_PATH || '.data/storeforge.db')

// WAL mode leaves -wal and -shm alongside the main file; all three must go.
let removed = 0
for (const file of [base, `${base}-wal`, `${base}-shm`]) {
  if (existsSync(file)) {
    rmSync(file)
    removed++
  }
}

console.log(removed ? `Removed ${removed} database file(s) at ${base}` : `Nothing to remove at ${base}`)
