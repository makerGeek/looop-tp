import { renderArtwork } from '../../utils/artwork'

/**
 * Serves generated SVG artwork. Immutable per seed, so it caches hard.
 */
export default defineEventHandler((event) => {
  const q = getQuery(event)
  const seed = String(q.seed ?? 'storeforge')
  const label = String(q.label ?? '')
  const variant = q.variant === 'scene' ? 'scene' : 'product'
  const width = Math.min(2000, Math.max(80, Number(q.w) || (variant === 'scene' ? 1600 : 800)))
  const height = Math.min(2000, Math.max(80, Number(q.h) || (variant === 'scene' ? 900 : 800)))

  setHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return renderArtwork({ seed, label, width, height, variant })
})
