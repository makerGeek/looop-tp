const RESERVED = new Set([
  'admin', 'api', 'app', 'dashboard', 'login', 'logout', 'signup', 'settings',
  'stores', 'store', 's', 'new', 'help', 'about', 'pricing', 'img', 'assets',
  'billing', 'webhooks', 'health', 'invite', 'team', 'org',
])

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'store'
}

/** Produces a slug unique per `taken`, and never a reserved route. */
export async function uniqueSlug(
  input: string,
  taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(input)
  let candidate = RESERVED.has(base) ? `${base}-shop` : base

  for (let n = 2; await taken(candidate); n++) {
    candidate = `${base}-${n}`
    // A pathological number of collisions means fall back to something random.
    if (n > 50) return `${base}-${Math.random().toString(36).slice(2, 8)}`
  }
  return candidate
}
