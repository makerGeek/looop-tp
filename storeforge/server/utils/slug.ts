const RESERVED = new Set([
  'admin', 'api', 'app', 'dashboard', 'login', 'logout', 'signup', 'settings',
  'stores', 'store', 's', 'new', 'help', 'about', 'pricing', 'img', 'assets',
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

/** Produces a slug that is unique per `taken`, and never a reserved route. */
export function uniqueSlug(input: string, taken: (slug: string) => boolean): string {
  const base = slugify(input)
  let candidate = RESERVED.has(base) ? `${base}-shop` : base
  let n = 2
  while (taken(candidate)) {
    candidate = `${base}-${n++}`
  }
  return candidate
}
