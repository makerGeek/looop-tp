import type { BuildAction } from '#shared/types'
import { appendChat, listChat } from '../../../db/repo'
import { requireOwnedStore } from '../../../utils/store-guard'
import { runBuilder } from '../../../ai/agent'

/**
 * Runs one builder turn and streams progress back as newline-delimited JSON.
 *
 * NDJSON rather than SSE: the client reads it with a plain fetch reader, and
 * there's no EventSource limitation around POST bodies or custom headers.
 */
export default defineEventHandler(async (event) => {
  const store = requireOwnedStore(event)
  const body = await readBody<{ message?: string }>(event)
  const message = (body?.message ?? '').trim()

  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'Describe what you want built' })
  }
  if (message.length > 4000) {
    throw createError({ statusCode: 400, statusMessage: 'That request is too long — try trimming it down' })
  }

  const history = listChat(store.id).map(m => ({ role: m.role, content: m.content }))
  appendChat(store.id, 'user', message)

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

      try {
        for await (const chunk of runBuilder(store, message, history)) {
          send(chunk)
          if (chunk.type === 'done') {
            finalMessage = chunk.message
            actions = chunk.actions
          }
          else if (chunk.type === 'error') {
            finalMessage = chunk.message
          }
        }
      }
      catch (err) {
        const text = err instanceof Error ? err.message : 'The build failed unexpectedly.'
        finalMessage = text
        send({ type: 'error', message: text })
      }
      finally {
        // Persist the assistant turn whatever happened, so the transcript
        // reflects reality rather than losing failed attempts.
        if (finalMessage) appendChat(store.id, 'assistant', finalMessage, actions)
        send({ type: 'end' })
        controller.close()
      }
    },
  })

  return stream
})
