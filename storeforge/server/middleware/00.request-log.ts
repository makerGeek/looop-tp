import { randomUUID } from 'node:crypto'

/**
 * Request logging.
 *
 * One JSON line per request, which is what log aggregators want and what a
 * human can still read with `jq`. A request id is attached to the event and
 * echoed in the response header, so a user-reported error can be traced to the
 * exact line.
 *
 * No pino: Nitro bundles for several runtimes and console.log is universally
 * available. Swap the emit if a transport is ever needed.
 */
declare module 'h3' {
  interface H3EventContext {
    requestId?: string
    orgId?: string
  }
}

// Storefront asset noise would drown out anything useful.
const QUIET = /^\/(?:_nuxt|img|favicon)/

export default defineEventHandler((event) => {
  const requestId = getHeader(event, 'x-request-id') ?? randomUUID()
  event.context.requestId = requestId
  setHeader(event, 'X-Request-Id', requestId)

  if (QUIET.test(event.path)) return

  const startedAt = Date.now()

  event.node.res.once('finish', () => {
    const status = event.node.res.statusCode
    const line = {
      level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      msg: 'request',
      requestId,
      method: event.method,
      path: event.path.split('?')[0],
      status,
      durationMs: Date.now() - startedAt,
      ...(event.context.orgId ? { orgId: event.context.orgId } : {}),
    }
    console.log(JSON.stringify(line))
  })
})
