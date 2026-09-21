import type { BuildAction, ChatMessageRecord } from '#shared/types'

export interface StreamEvent {
  type: 'thinking' | 'text' | 'action' | 'done' | 'error' | 'end'
  text?: string
  message?: string
  action?: BuildAction
  actions?: BuildAction[]
}

export interface TranscriptEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions: BuildAction[]
  streaming?: boolean
}

/**
 * Drives one store's build conversation.
 *
 * Reads the NDJSON stream from /build so each tool call shows up the moment the
 * server runs it, rather than the whole turn landing at once.
 */
export function useBuilder(storeId: string, initial: ChatMessageRecord[]) {
  const transcript = ref<TranscriptEntry[]>(
    initial.map(m => ({ id: m.id, role: m.role, content: m.content, actions: m.actions })),
  )
  const running = ref(false)
  const thinking = ref<string | null>(null)
  const error = ref<string | null>(null)

  /** Bumped after every completed turn so the preview iframe reloads. */
  const revision = ref(0)

  async function send(message: string): Promise<void> {
    const text = message.trim()
    if (!text || running.value) return

    running.value = true
    error.value = null
    thinking.value = null

    transcript.value.push({ id: `u-${Date.now()}`, role: 'user', content: text, actions: [] })

    const reply: TranscriptEntry = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
      actions: [],
      streaming: true,
    }
    transcript.value.push(reply)

    try {
      const response = await fetch(`/api/stores/${storeId}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok || !response.body) {
        throw new Error(response.statusText || 'The builder could not be reached')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // NDJSON: everything before the last newline is a complete event.
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          let event: StreamEvent
          try {
            event = JSON.parse(line) as StreamEvent
          }
          catch {
            continue
          }
          handle(event, reply)
        }
      }
    }
    catch (err: any) {
      error.value = err?.message ?? 'The build failed'
      reply.content = reply.content || 'The build failed before it finished.'
    }
    finally {
      reply.streaming = false
      thinking.value = null
      running.value = false
      revision.value++
    }
  }

  function handle(event: StreamEvent, reply: TranscriptEntry) {
    switch (event.type) {
      case 'thinking':
        thinking.value = event.text ?? null
        break
      case 'action':
        if (event.action) reply.actions.push(event.action)
        thinking.value = null
        break
      case 'text':
        reply.content = event.text ?? reply.content
        break
      case 'done':
        reply.content = event.message ?? reply.content
        if (event.actions?.length) reply.actions = event.actions
        break
      case 'error':
        error.value = event.message ?? 'Something went wrong'
        reply.content = event.message ?? reply.content
        break
    }
  }

  return { transcript, running, thinking, error, revision, send }
}
