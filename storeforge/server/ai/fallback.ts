import type { BuildAction, StoreRecord } from '#shared/types'
import { listPages, listProducts } from '../db/repo'
import { artworkUrl } from '../utils/artwork'
import { slugify } from '../utils/slug'
import { executeTool } from './tools'
import { matchNiche, type NicheKit } from './niches'
import type { BuildEvent } from './agent'

/**
 * The no-API-key planner.
 *
 * It is deliberately not a fake model: it does not pretend to understand
 * arbitrary requests. It recognises a niche, builds a complete real store
 * through the same tool executors the model uses, and handles a handful of
 * obvious follow-up edits (colour, publish, price). Anything beyond that, it
 * says so plainly rather than silently doing nothing.
 */
export async function* runFallbackPlanner(
  store: StoreRecord,
  userMessage: string,
): AsyncGenerator<BuildEvent> {
  const actions: BuildAction[] = []
  const emit = (action: BuildAction | undefined) => {
    if (action) actions.push(action)
    return action
  }

  const isEmpty = listPages(store.id).length === 0 && listProducts(store.id).length === 0
  const intent = classify(userMessage, isEmpty)

  yield { type: 'thinking', text: `Local planner: ${intent.label}` }

  if (intent.kind === 'build') {
    const kit = matchNiche(userMessage)
    const name = deriveName(userMessage, kit)

    for (const event of buildWholeStore(store, kit, name)) {
      const action = emit(event)
      if (action) yield { type: 'action', action }
      // Yield to the event loop so the client sees steps arrive progressively.
      await new Promise(resolve => setTimeout(resolve, 120))
    }

    yield {
      type: 'done',
      message: `Built ${name} — a ${kit.id === 'generic' ? 'general goods' : kit.id} store with ${kit.products.length} products, a home page, a catalogue and an about page. `
        + 'Set ANTHROPIC_API_KEY to have Claude build to your description instead of this template, then ask for any change you like.',
      actions,
    }
    return
  }

  if (intent.kind === 'publish') {
    const action = emit(executeTool(store.id, 'publish_store', { published: intent.published }).action)
    if (action) yield { type: 'action', action }
    yield {
      type: 'done',
      message: intent.published
        ? `${store.name} is live. Anyone with the link can browse and check out.`
        : `${store.name} is back to draft and no longer publicly reachable.`,
      actions,
    }
    return
  }

  if (intent.kind === 'recolor') {
    const action = emit(executeTool(store.id, 'set_brand_and_theme', { palette: intent.palette }).action)
    if (action) yield { type: 'action', action }
    yield {
      type: 'done',
      message: `Switched the palette to ${intent.label}. Add an API key for edits more specific than this.`,
      actions,
    }
    return
  }

  yield {
    type: 'done',
    message: 'The local planner only handles building a new store, recolouring it, and publishing. '
      + 'Set ANTHROPIC_API_KEY in your .env and restart to have Claude handle requests like this one.',
    actions: [],
  }
}

type Intent =
  | { kind: 'build', label: string }
  | { kind: 'publish', published: boolean, label: string }
  | { kind: 'recolor', palette: Record<string, string>, label: string }
  | { kind: 'unsupported', label: string }

const PALETTES: Record<string, Record<string, string>> = {
  dark: { primary: '#f5f5f5', onPrimary: '#121212', background: '#101114', surface: '#1a1c20', text: '#f0f1f3', muted: '#9aa0a8', border: '#2a2d33', accent: '#7aa2f7' },
  light: { primary: '#1f2937', onPrimary: '#ffffff', background: '#ffffff', surface: '#f7f8fa', text: '#111827', muted: '#6b7280', border: '#e5e7eb', accent: '#2563eb' },
  warm: { primary: '#7a3e1d', onPrimary: '#fdf7f0', background: '#fdf8f3', surface: '#f6e9db', text: '#3b2417', muted: '#8a6a53', border: '#e8d6c2', accent: '#c26a35' },
  cool: { primary: '#1e3a5f', onPrimary: '#f2f7fc', background: '#f7fafd', surface: '#e8f0f8', text: '#15263b', muted: '#5f7a94', border: '#d3e0ed', accent: '#3b82c4' },
}

function classify(message: string, isEmpty: boolean): Intent {
  const text = message.toLowerCase()

  // An empty store always needs building first. Checking this before the
  // colour keywords stops a phrase like "plants for low light" from being
  // read as a request to recolour a store that does not exist yet.
  if (isEmpty) {
    return { kind: 'build', label: 'building a full store from the closest template' }
  }

  if (/\b(unpublish|take .* (offline|down)|back to draft)\b/.test(text)) {
    return { kind: 'publish', published: false, label: 'unpublishing' }
  }
  if (/\b(publish|go live|make it live|launch)\b/.test(text)) {
    return { kind: 'publish', published: true, label: 'publishing' }
  }

  // Only treat a colour word as a restyle when it reads like an instruction
  // about the store's appearance, not incidental product vocabulary.
  const restyling = /\b(make|turn|switch|change|go|use|try)\b/.test(text)
    || /\b(theme|palette|colou?rs?|look|style)\b/.test(text)
  if (restyling) {
    for (const [key, palette] of Object.entries(PALETTES)) {
      if (new RegExp(`\\b${key}(er)?\\b`).test(text)) {
        return { kind: 'recolor', palette, label: `a ${key} palette` }
      }
    }
  }

  if (/\b(build|create|make|start|set up|rebuild|another store)\b/.test(text)) {
    return { kind: 'build', label: 'rebuilding from the closest template' }
  }
  return { kind: 'unsupported', label: 'no local handler for this request' }
}

/** Pulls a plausible brand name out of the prompt, or falls back to the kit's. */
function deriveName(message: string, kit: NicheKit): string {
  const quoted = message.match(/["“']([^"”']{2,40})["”']/)
  if (quoted?.[1]) return titleCase(quoted[1])

  const called = message.match(/\b(?:called|named)\s+([A-Za-z0-9&'’\- ]{2,40})/i)
  if (called?.[1]) return titleCase(called[1].replace(/\s+(that|which|who|and|selling|with).*$/i, '').trim())

  return kit.nameParts.join(' ')
}

function titleCase(input: string): string {
  return input.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Runs the full build, returning each tool's action in order. */
function* buildWholeStore(store: StoreRecord, kit: NicheKit, name: string): Generator<BuildAction | undefined> {
  yield executeTool(store.id, 'set_brand_and_theme', {
    name,
    tagline: kit.tagline,
    announcement: kit.announcement,
    palette: kit.theme.palette,
    fonts: kit.theme.fonts,
    radius: kit.theme.radius,
    density: kit.theme.density,
    buttonStyle: kit.theme.buttonStyle,
  }).action

  yield executeTool(store.id, 'add_products', {
    products: kit.products.map(p => ({
      title: p.title,
      handle: slugify(p.title),
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAt,
      collection: p.collection,
      inventory: 80,
      variants: p.variants?.map(v => ({ title: v })),
    })),
  }).action

  const heroHandles = kit.products.slice(0, 3).map(p => slugify(p.title))

  yield executeTool(store.id, 'upsert_page', {
    path: '/',
    title: name,
    navLabel: 'Home',
    navOrder: 0,
    sections: [
      {
        type: 'hero',
        eyebrow: kit.announcement.split('·')[0]?.trim(),
        heading: kit.tagline,
        subheading: kit.about.split('. ').slice(0, 2).join('. ') + '.',
        ctaLabel: 'Shop the catalogue',
        ctaHref: '/products',
        secondaryCtaLabel: 'Our story',
        secondaryCtaHref: '/about',
        layout: 'split',
        image: artworkUrl(`${store.id}:hero`, name, 'scene'),
      },
      { type: 'featured_products', heading: 'Start here', subheading: 'The three people order first.', handles: heroHandles, columns: 3 },
      { type: 'feature_grid', heading: 'Why buy from us', items: kit.valueProps },
      { type: 'testimonials', heading: 'What customers say', items: kit.testimonials },
      { type: 'featured_products', heading: 'The full catalogue', limit: 8, columns: 4 },
      { type: 'cta_banner', heading: 'Questions before you buy?', body: 'Email us and a human who knows the products will answer.', ctaLabel: 'Read the FAQ', ctaHref: '/about' },
    ],
  }).action

  yield executeTool(store.id, 'upsert_page', {
    path: '/products',
    title: 'Everything we make',
    navLabel: 'Shop',
    navOrder: 1,
    sections: [
      { type: 'rich_text', heading: 'Everything we make', body: kit.about, align: 'center' },
      { type: 'featured_products', limit: 50, columns: 3 },
      { type: 'newsletter', heading: 'New arrivals, occasionally', body: 'A short email when something genuinely new lands. Usually monthly, never more.', buttonLabel: 'Subscribe' },
    ],
  }).action

  yield executeTool(store.id, 'upsert_page', {
    path: '/about',
    title: 'About',
    navLabel: 'About',
    navOrder: 2,
    sections: [
      { type: 'rich_text', heading: 'Our story', body: kit.about },
      { type: 'feature_grid', heading: 'How we work', items: kit.valueProps },
      { type: 'faq', heading: 'Frequently asked', items: kit.faq },
      { type: 'cta_banner', heading: 'Ready to browse?', ctaLabel: 'Shop the catalogue', ctaHref: '/products' },
    ],
  }).action

  yield executeTool(store.id, 'update_settings', {
    currency: 'USD',
    shippingFlat: 5.99,
    freeShippingThreshold: 75,
    supportEmail: `hello@${slugify(name)}.com`,
    footerLinks: [
      { label: 'Shop', href: '/products' },
      { label: 'About', href: '/about' },
    ],
    socialLinks: [
      { label: 'Instagram', href: 'https://instagram.com' },
      { label: 'Newsletter', href: '/about' },
    ],
  }).action
}
