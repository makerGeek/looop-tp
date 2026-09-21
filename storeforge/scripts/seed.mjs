/**
 * Creates a demo account and a fully built store against a running server.
 *
 * Runs over HTTP rather than touching SQLite directly so it exercises the same
 * signup → create → build path a real user takes.
 *
 *   npm run dev            # in one terminal
 *   npm run seed           # in another
 */
const BASE = process.env.SEED_URL || 'http://localhost:3000'
const EMAIL = process.env.SEED_EMAIL || 'demo@storeforge.test'
const PASSWORD = process.env.SEED_PASSWORD || 'forge-demo-2024'
const PROMPT = process.argv.slice(2).join(' ')
  || 'A small-batch coffee roaster selling single origin beans and a subscription'

let cookie = ''

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...options.headers,
    },
  })

  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0]

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${body.slice(0, 200)}`)
  }
  return res
}

async function main() {
  console.log(`Seeding ${BASE}`);

  try {
    await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'Demo Merchant' }),
    })
    console.log(`  created account ${EMAIL}`)
  }
  catch {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
    console.log(`  signed in as ${EMAIL}`)
  }

  const store = await (await api('/api/stores', {
    method: 'POST',
    body: JSON.stringify({ name: 'Demo Store' }),
  })).json()
  console.log(`  created store ${store.id} (/s/${store.slug})`)

  console.log(`  building: "${PROMPT}"`)
  const res = await api(`/api/stores/${store.id}/build`, {
    method: 'POST',
    body: JSON.stringify({ message: PROMPT }),
  })

  // The build endpoint streams NDJSON; print each step as it lands.
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      const event = JSON.parse(line)
      if (event.type === 'action') console.log(`    ✓ ${event.action.summary}`)
      if (event.type === 'done') console.log(`\n  ${event.message}`)
      if (event.type === 'error') console.error(`  ! ${event.message}`)
    }
  }

  await api(`/api/stores/${store.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'published' }),
  })

  console.log(`\nDone. Sign in at ${BASE}/login with ${EMAIL} / ${PASSWORD}`)
  console.log(`Storefront: ${BASE}/s/${store.slug}`)
}

main().catch((err) => {
  console.error(`\nSeed failed: ${err.message}`)
  console.error(`Is the dev server running at ${BASE}?`)
  process.exit(1)
})
