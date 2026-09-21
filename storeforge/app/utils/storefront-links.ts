/**
 * Builds storefront URLs.
 *
 * Section `ctaHref` values are authored as store-relative paths ("/products"),
 * so every one has to be rebased onto /s/<slug> before it becomes a real link.
 * External and anchor links pass through untouched.
 */
export function storeHref(slug: string, href: string | undefined): string {
  if (!href) return `/s/${slug}`
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return href

  const path = href.startsWith('/') ? href : `/${href}`
  return path === '/' ? `/s/${slug}` : `/s/${slug}${path}`
}

export function productHref(slug: string, handle: string): string {
  return `/s/${slug}/p/${handle}`
}
