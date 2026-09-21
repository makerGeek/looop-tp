import { existsSync } from 'node:fs'
import { spawn, type ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

/**
 * Boots a real server for the integration suite.
 *
 * Tests run against the production bundle over HTTP rather than through a
 * mocked app: routing, cookies, streaming and the Postgres driver are exactly
 * the parts most likely to break, and only a real server exercises them.
 */

const PORT = Number(process.env.TEST_PORT ?? 3210)
const DATABASE_URL = process.env.TEST_DATABASE_URL
  ?? 'postgres://postgres@localhost:5432/storeforge_test'

let server: ChildProcess | null = null

async function resetSchema(): Promise<void> {
  // `onnotice` silences the cascade NOTICEs the drop emits.
  const client = postgres(DATABASE_URL, { max: 1, onnotice: () => {} })
  try {
    // Drizzle records applied migrations in its own `drizzle` schema. Dropping
    // only `public` would leave that journal behind, so the migrator would
    // consider everything applied and recreate nothing.
    await client.unsafe(
      'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;',
    )
    await migrate(drizzle(client), { migrationsFolder: './server/db/migrations' })
  }
  finally {
    await client.end()
  }
}

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`)
      if (res.ok) return
    }
    catch {
      // Not listening yet.
    }
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error(`Test server did not become ready at ${url}`)
}

export async function setup(): Promise<void> {
  const entry = resolve(process.cwd(), '.output/server/index.mjs')
  if (!existsSync(entry)) {
    throw new Error(
      'No production build found. Run `npm run build` before `npm test` '
      + '(CI does this automatically).',
    )
  }

  await resetSchema()

  server = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      NUXT_DATABASE_URL: DATABASE_URL,
      NUXT_SESSION_SECRET: 'test-secret-0123456789abcdef0123456789abcdef',
      NUXT_PUBLIC_APP_URL: `http://127.0.0.1:${PORT}`,
      // Exercise the local planner, not the live model.
      NUXT_ANTHROPIC_API_KEY: '',
      ANTHROPIC_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const logs: string[] = []
  server.stdout?.on('data', d => logs.push(String(d)))
  server.stderr?.on('data', d => logs.push(String(d)))
  server.on('exit', (code) => {
    if (code) console.error(`Test server exited with ${code}:\n${logs.join('')}`)
  })

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`)
  }
  catch (err) {
    console.error(logs.join(''))
    throw err
  }

  process.env.TEST_BASE_URL = `http://127.0.0.1:${PORT}`
}

export async function teardown(): Promise<void> {
  server?.kill('SIGTERM')
  // Give it a moment to release the port before the next run.
  await new Promise(r => setTimeout(r, 300))
  server?.kill('SIGKILL')
}
