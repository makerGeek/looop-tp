/**
 * A tiny, dependency-free OpenAI client.
 *
 * The official SDK assumes a Node-ish environment; on React Native it's simpler
 * and lighter to speak HTTP directly. Everything here is transport only —
 * prompt construction lives in `nlu.ts`, audio handling in `transcribe.ts` and
 * `speak.ts`.
 *
 * ## On shipping API keys in a mobile app
 * There is no backend in this project, so the key travels with the client. That
 * is fine for development and for a personal build, and genuinely unsafe for a
 * public release: anyone can pull it out of the binary. `docs/architecture.md`
 * describes the one-file change that moves these calls behind a proxy.
 */

export const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export class OpenAIError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly kind: 'auth' | 'rate-limit' | 'network' | 'server' | 'unknown' = 'unknown'
  ) {
    super(message);
    this.name = 'OpenAIError';
  }

  /** A sentence that is safe to say out loud to the player. */
  get spokenMessage(): string {
    switch (this.kind) {
      case 'auth':
        return 'My OpenAI key was rejected. Check it in Settings.';
      case 'rate-limit':
        return 'The voice service is rate limiting me. Try again in a moment.';
      case 'network':
        return "I can't reach the voice service. You can still tap your moves.";
      default:
        return 'The voice service had a problem. You can still tap your moves.';
    }
  }
}

export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
}

export function isConfigured(config: Partial<OpenAIConfig> | null | undefined): config is OpenAIConfig {
  return Boolean(config?.apiKey && config.apiKey.trim().length > 0);
}

const DEFAULT_TIMEOUT_MS = 20_000;

/** POSTs JSON and parses a JSON response, mapping failures onto `OpenAIError`. */
export async function postJson<T>(
  config: OpenAIConfig,
  path: string,
  body: unknown,
  { timeoutMs = DEFAULT_TIMEOUT_MS, signal }: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<T> {
  const response = await request(config, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs,
    signal,
  });
  return (await response.json()) as T;
}

/** POSTs JSON and returns raw bytes — used by text-to-speech. */
export async function postJsonForBytes(
  config: OpenAIConfig,
  path: string,
  body: unknown,
  { timeoutMs = DEFAULT_TIMEOUT_MS, signal }: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<Uint8Array> {
  const response = await request(config, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs,
    signal,
  });
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function request(
  config: OpenAIConfig,
  path: string,
  init: RequestInit & { timeoutMs: number; signal?: AbortSignal }
): Promise<Response> {
  const { timeoutMs, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort());

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        ...(rest.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) throw await toError(response);
    return response;
  } catch (error) {
    if (error instanceof OpenAIError) throw error;
    if ((error as Error)?.name === 'AbortError') {
      throw new OpenAIError('The request timed out.', undefined, 'network');
    }
    throw new OpenAIError((error as Error)?.message ?? 'Network request failed', undefined, 'network');
  } finally {
    clearTimeout(timer);
  }
}

export async function toError(response: Response): Promise<OpenAIError> {
  let detail = '';
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    detail = body?.error?.message ?? '';
  } catch {
    detail = await response.text().catch(() => '');
  }

  const kind =
    response.status === 401 || response.status === 403
      ? 'auth'
      : response.status === 429
        ? 'rate-limit'
        : response.status >= 500
          ? 'server'
          : 'unknown';

  return new OpenAIError(detail || `OpenAI request failed (${response.status})`, response.status, kind);
}
