/** The server the global setup started. */
export const baseUrl = () => process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3210'

/**
 * A fetch bound to one browser-like cookie jar.
 *
 * The suites check tenancy and cart isolation, which only mean anything if two
 * "users" can hold separate sessions against the same server.
 */
let clientSeq = 0

export function createClient(baseURL: string = baseUrl()) {
  const jar = new Map<string, string>()

  // Each client presents a distinct address. Sharing one would make every
  // suite contend for the same rate-limit bucket, which is not what separate
  // users look like.
  clientSeq += 1
  const ip = `203.0.113.${clientSeq % 254 + 1}`

  function cookieHeader(): string {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  function absorb(response: Response): void {
    // undici exposes multiple Set-Cookie headers through getSetCookie().
    const raw = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean) as string[]

    for (const line of raw) {
      const [pair] = line.split(';')
      const idx = pair!.indexOf('=')
      if (idx > 0) jar.set(pair!.slice(0, idx).trim(), pair!.slice(idx + 1).trim())
    }
  }

  async function raw(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('x-forwarded-for', ip)
    if (jar.size) headers.set('cookie', cookieHeader())
    if (init.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }

    const response = await fetch(`${baseURL}${path}`, { ...init, headers, redirect: 'manual' })
    absorb(response)
    return response
  }

  return {
    raw,
    async json<T>(path: string, init: RequestInit = {}): Promise<T> {
      const response = await raw(path, init)
      if (!response.ok) {
        const body = await response.text()
        throw Object.assign(new Error(`${init.method ?? 'GET'} ${path} → ${response.status}: ${body.slice(0, 300)}`), {
          status: response.status,
          body,
        })
      }
      return response.json() as Promise<T>
    },
    async status(path: string, init: RequestInit = {}): Promise<number> {
      return (await raw(path, init)).status
    },
    post: (path: string, body: unknown) => ({ method: 'POST', body: JSON.stringify(body) } as RequestInit),
  }
}

export const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })
export const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) })
export const del = (body?: unknown): RequestInit => ({
  method: 'DELETE',
  ...(body ? { body: JSON.stringify(body) } : {}),
})
export const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) })
