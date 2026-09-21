import Anthropic from '@anthropic-ai/sdk'
import type { BuildAction, StoreRecord } from '#shared/types'
import { listPages, listProducts } from '../db/repo'
import { SYSTEM_PROMPT, storeContext } from './prompt'
import { TOOL_DEFINITIONS, executeTool } from './tools'
import { runFallbackPlanner } from './fallback'

export type BuildEvent =
  | { type: 'thinking', text: string }
  | { type: 'text', text: string }
  | { type: 'action', action: BuildAction }
  | { type: 'done', message: string, actions: BuildAction[] }
  | { type: 'error', message: string }

/** Hard stop on tool rounds so a confused model can't loop forever on the merchant's bill. */
const MAX_ROUNDS = 12

/**
 * Resolves AI settings at request time.
 *
 * `runtimeConfig` bakes `process.env` values in at build time, so a production
 * build started with `ANTHROPIC_API_KEY=... node .output/server/index.mjs`
 * would otherwise ignore the key. Reading the environment here keeps the
 * plain variable name working at runtime, while Nuxt's own `NUXT_`-prefixed
 * override still takes precedence when it is set.
 */
export function aiSettings(): { apiKey: string, model: string } {
  const config = useRuntimeConfig()
  return {
    apiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
    model: config.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-opus-5',
  }
}

export function isAiConfigured(): boolean {
  return !!aiSettings().apiKey
}

/**
 * Runs one builder turn, streaming progress as it goes.
 *
 * Without an API key this delegates to the local planner, which emits the same
 * event shape through the same tool executors — so the UI, the persistence path
 * and the resulting store are identical either way.
 */
export async function* runBuilder(
  store: StoreRecord,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant', content: string }>,
): AsyncGenerator<BuildEvent> {
  const { apiKey, model } = aiSettings()

  if (!apiKey) {
    yield* runFallbackPlanner(store, userMessage)
    return
  }

  const client = new Anthropic({ apiKey })
  const actions: BuildAction[] = []
  let finalText = ''

  const pages = listPages(store.id).map(p => p.path)
  const productCount = listProducts(store.id).length

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content } as Anthropic.MessageParam)),
    { role: 'user', content: `${storeContext(store, productCount, pages)}\n\n---\n\n${userMessage}` },
  ]

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const stream = client.messages.stream({
        model,
        max_tokens: 64000,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort: 'high' },
        tools: TOOL_DEFINITIONS.map(tool => ({ ...tool, eager_input_streaming: true })),
        messages,
      })

      // Surface progress as it arrives rather than after the whole turn lands.
      let textBuffer = ''
      stream.on('text', (delta) => { textBuffer += delta })

      const response = await stream.finalMessage()

      if (response.stop_reason === 'refusal') {
        yield { type: 'error', message: 'The model declined this request. Try rephrasing what you want built.' }
        return
      }

      // A truncated turn can carry half-parsed tool inputs. Running them would
      // write a partially-built page, so stop instead of corrupting the store.
      if (response.stop_reason === 'max_tokens') {
        yield {
          type: 'error',
          message: 'That request was too large to complete in one pass. Try asking for it in smaller pieces.',
        }
        return
      }

      for (const block of response.content) {
        if (block.type === 'thinking' && block.thinking) {
          yield { type: 'thinking', text: block.thinking }
        }
        else if (block.type === 'text' && block.text.trim()) {
          finalText = block.text.trim()
          yield { type: 'text', text: block.text }
        }
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )

      if (response.stop_reason !== 'tool_use' || !toolUses.length) {
        if (!finalText && textBuffer.trim()) finalText = textBuffer.trim()
        yield { type: 'done', message: finalText || 'Done.', actions }
        return
      }

      messages.push({ role: 'assistant', content: response.content })

      const results: Anthropic.ToolResultBlockParam[] = []
      for (const call of toolUses) {
        let outcome
        try {
          outcome = executeTool(store.id, call.name, call.input)
        }
        catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          results.push({ type: 'tool_result', tool_use_id: call.id, is_error: true, content: message })
          continue
        }

        if (outcome.action) {
          actions.push(outcome.action)
          yield { type: 'action', action: outcome.action }
        }
        results.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: JSON.stringify(outcome.result).slice(0, 20_000),
        })
      }

      // All tool results for a turn go back in one user message — splitting them
      // teaches the model to stop calling tools in parallel.
      messages.push({ role: 'user', content: results })
    }

    yield {
      type: 'done',
      message: finalText || 'I made a lot of changes but hit the step limit for one request. Ask me to continue.',
      actions,
    }
  }
  catch (err) {
    yield { type: 'error', message: describeError(err) }
  }
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in your .env.'
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Rate limited by the Anthropic API. Wait a moment and try again.'
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error (${err.status}): ${err.message}`
  }
  return err instanceof Error ? err.message : 'Something went wrong while building.'
}
