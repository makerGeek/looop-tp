import type { BuildAction } from '#shared/types'
import { appendChat, listChat } from '../../../db/repo'
import { requireStoreAccess } from '../../../utils/store-guard'
import { runBuilder, type BuildUsage } from '../../../ai/agent'
import { claimBuild, recordUsage, releaseBuild } from '../../../billing/usage'

/**
 * Runs one builder turn and streams progress back as newline-delimited JSON.
 *
 * NDJSON rather than SSE: the client reads it with a plain fetch reader, with no
 * EventSource limitation around POST bodies or custom headers.
 */
export default defineEventHandler(async (event) => {
  const { store } = await requireStoreAccess(event)
  const body = await readBody<{ message?: string }>(event)
  const message = (body?.message ?? '').trim()

  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'Describe what you want built' })
  }
  if (message.length > 4000) {
    throw createError({ statusCode: 400, statusMessage: 'That request is too long — try trimming it down' })
  }

  // Claim quota before the model runs. Doing it after would let a burst of
  // concurrent requests all spend tokens before any of them was counted.
  const claim = await claimBuild(store.orgId)
  if (!claim.ok) {
    throw createError({
      statusCode: 402,
      statusMessage: `You've used all ${claim.limit} AI builds this month. Upgrade your plan for more.`,
    })
  }

  const history = (await listChat(store.id)).map(m => ({ role: m.role, content: m.content }))
  await appendChat(store.id, 'user', message)

  setHeader(event, 'Content-Type', 'application/x-ndjson; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'))
      }

      let finalMessage = ''
      let actions: BuildAction[] = []
      let usage: BuildUsage | null = null
      let failedBeforeSpending = false

      try {
        for await (const chunk of runBuilder(store, message, history)) {
          send(chunk)

          if (chunk.type === 'done') {
            finalMessage = chunk.message
            actions = chunk.actions
            usage = chunk.usage
          }
          else if (chunk.type === 'error') {
            finalMessage = chunk.message
            failedBeforeSpending = true
          }
        }
      }
      catch (err) {
        const text = err instanceof Error ? err.message : 'The build failed unexpectedly.'
        finalMessage = text
        failedBeforeSpending = true
        send({ type: 'error', message: text })
      }
      finally {
        // Persist the assistant turn whatever happened, so the transcript
        // reflects reality rather than losing failed attempts.
        if (finalMessage) await appendChat(store.id, 'assistant', finalMessage, actions)

        if (usage) await recordUsage(store.orgId, usage)
        // A turn that never reached the model shouldn't cost a build.
        if (failedBeforeSpending && !usage) await releaseBuild(store.orgId)

        send({ type: 'end' })
        controller.close()
      }
    },
  })

  return stream
})
