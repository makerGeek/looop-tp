/**
 * Deterministic placeholder artwork.
 *
 * Generated stores need imagery immediately, and reaching out to a stock-photo
 * host would make the builder fail offline and leak store contents to a third
 * party. Instead every image is an SVG derived from a seed string, so the same
 * product always renders the same art and nothing leaves the server.
 */

const PALETTES: Array<[string, string, string]> = [
  ['#f7d9c4', '#c9ada7', '#4a4e69'],
  ['#dbe7e4', '#a5c4d4', '#22333b'],
  ['#fde2e4', '#e8c1c5', '#6d597a'],
  ['#e4f0d0', '#b5c99a', '#3a5a40'],
  ['#fff1e6', '#f0c987', '#7f5539'],
  ['#e0e1dd', '#a9bcd0', '#1b263b'],
  ['#ffe5ec', '#ffc2d1', '#a4133c'],
  ['#d8e2dc', '#9db4c0', '#2f3e46'],
]

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function initials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '•'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' }[c]!
  ))
}

export interface ArtworkOptions {
  seed: string
  label?: string
  width?: number
  height?: number
  /** `product` draws a centred motif; `scene` draws a wide banner. */
  variant?: 'product' | 'scene'
}

export function renderArtwork(opts: ArtworkOptions): string {
  const { seed } = opts
  const width = opts.width ?? 800
  const height = opts.height ?? 800
  const label = opts.label ?? ''
  const variant = opts.variant ?? 'product'

  const h = hash(seed)
  const [light, mid, dark] = PALETTES[h % PALETTES.length]!
  const angle = (h >> 3) % 180
  const shape = (h >> 5) % 4

  const motif = variant === 'scene'
    ? sceneMotif(h, width, height, mid, dark)
    : productMotif(shape, h, width, height, mid, dark)

  const text = label && variant === 'product'
    ? `<text x="50%" y="92%" text-anchor="middle" font-family="Georgia, serif"
         font-size="${Math.round(width * 0.055)}" fill="${dark}" opacity="0.75"
         letter-spacing="${width * 0.006}">${escapeXml(initials(label))}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(label || 'Product artwork')}">
  <defs>
    <linearGradient id="bg" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="100%" stop-color="${mid}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${motif}
  ${text}
</svg>`
}

function productMotif(shape: number, h: number, w: number, ht: number, mid: string, dark: string): string {
  const cx = w / 2
  const cy = ht / 2
  const r = Math.min(w, ht) * 0.26

  switch (shape) {
    case 0:
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark}" opacity="0.14"/>
        <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="none" stroke="${dark}" stroke-width="${w * 0.006}" opacity="0.5"/>`
    case 1: {
      const s = r * 1.5
      return `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" rx="${s * 0.12}" fill="${dark}" opacity="0.13"/>
        <line x1="${cx - s / 2}" y1="${cy}" x2="${cx + s / 2}" y2="${cy}" stroke="${dark}" stroke-width="${w * 0.005}" opacity="0.45"/>`
    }
    case 2: {
      const bars = 5
      return Array.from({ length: bars }, (_, i) => {
        const bw = w * 0.07
        const bh = ht * (0.18 + ((h >> (i + 2)) % 30) / 100)
        const x = cx - (bars * bw * 1.6) / 2 + i * bw * 1.6
        return `<rect x="${x}" y="${cy + r - bh}" width="${bw}" height="${bh}" rx="${bw / 2}" fill="${dark}" opacity="${0.12 + i * 0.04}"/>`
      }).join('\n  ')
    }
    default:
      return `<path d="M ${cx} ${cy - r} Q ${cx + r} ${cy} ${cx} ${cy + r} Q ${cx - r} ${cy} ${cx} ${cy - r} Z" fill="${dark}" opacity="0.14"/>
        <circle cx="${cx}" cy="${cy}" r="${r * 0.18}" fill="${mid}"/>`
  }
}

function sceneMotif(h: number, w: number, ht: number, mid: string, dark: string): string {
  const hills = Array.from({ length: 3 }, (_, i) => {
    const y = ht * (0.55 + i * 0.13)
    const amp = ht * (0.1 + ((h >> (i + 1)) % 10) / 100)
    return `<path d="M0 ${y} Q ${w * 0.25} ${y - amp} ${w * 0.5} ${y} T ${w} ${y} L ${w} ${ht} L 0 ${ht} Z"
      fill="${i % 2 ? mid : dark}" opacity="${0.16 + i * 0.07}"/>`
  }).join('\n  ')
  const sunX = w * (0.2 + ((h >> 6) % 60) / 100)
  return `<circle cx="${sunX}" cy="${ht * 0.3}" r="${ht * 0.12}" fill="${dark}" opacity="0.12"/>\n  ${hills}`
}

/** Convenience URL builder used by the AI tools and seed data. */
export function artworkUrl(seed: string, label: string, variant: 'product' | 'scene' = 'product'): string {
  const params = new URLSearchParams({ seed, label, variant })
  return `/img/art?${params.toString()}`
}
