import { serverConfig } from '../config'

/**
 * Validates configuration at boot.
 *
 * Fails the process immediately with a message naming every missing value,
 * rather than letting the first request that needs a secret discover it.
 */
export default defineNitroPlugin(() => {
  try {
    const config = serverConfig()

    const degraded: string[] = []
    if (!config.anthropicApiKey) degraded.push('AI generation (local planner will be used)')
    if (!config.stripeSecretKey) degraded.push('billing (every org stays on the free plan)')
    if (!config.resendApiKey) degraded.push('email (messages are logged, not sent)')

    if (degraded.length) {
      console.warn(`[storeforge] Running with reduced functionality: ${degraded.join('; ')}`)
    }
  }
  catch (err) {
    console.error(err instanceof Error ? err.message : err)
    // A server that cannot read its own configuration must not accept traffic.
    process.exit(1)
  }
})
