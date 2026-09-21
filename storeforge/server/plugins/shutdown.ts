import { closeDb } from '../db/index'

/**
 * Closes the database pool on shutdown.
 *
 * Without this, a rolling deploy leaves connections open until Postgres times
 * them out — which on a small connection cap is enough to make the new
 * instance fail to connect.
 */
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('close', async () => {
    await closeDb()
  })
})
