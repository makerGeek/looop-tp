import type { BuildAction, StoreRecord } from '#shared/types'
import { listPages, listProducts } from '../db/repo'
import { artworkUrl } from '../utils/artwork'
import { slugify } from '../utils/slug'
import { executeTool } from './tools'
import { matchNiche, type NicheKit } from './niches'
import type { BuildEvent, BuildUsage } from './agent'

/** The local planner spends no tokens, but the event shape stays the same. */
const NO_USAGE: BuildUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 }

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

  const [existingPages, existingProducts] = await Promise.all([
    listPages(store.id),
    listProducts(store.id),
  ])
  const isEmpty = existingPages.length === 0 && existingProducts.length === 0
  const intent = classify(userMessage, isEmpty)

  yield { type: 'thinking', text: `Local planner: ${intent.label}` }

  if (intent.kind === 'build') {
    const kit = matchNiche(userMessage)
    const name = deriveName(userMessage, kit, store.name)

    for (const step of buildSteps(store, kit, name)) {
      const { action } = await executeTool(store.id, step.tool, step.input)
      if (action) {
        actions.push(action)
        yield { type: 'action', action }
      }
      // A short pause so the client sees steps arrive progressively rather than
      // all at once — the model path is naturally paced by generation latency.
      await new Promise(resolve => setTimeout(resolve, 120))
    }

    yield {
      type: 'done',
      message: `Built ${name} — a ${kit.id === 'generic' ? 'general goods' : kit.id} store with ${kit.products.length} products, a home page, a catalogue and an about page. `
        + 'Set ANTHROPIC_API_KEY to have Claude build to your description instead of this template, then ask for any change you like.',
      actions,
      usage: NO_USAGE,
    }
    return
  }

  if (intent.kind === 'publish') {
    const { action } = await executeTool(store.id, 'publish_store', { published: intent.published })
    if (action) {
      actions.push(action)
      yield { type: 'action', action }
    }
    yield {
      type: 'done',
      message: intent.published
        ? `${store.name} is live. Anyone with the link can browse and check out.`
        : `${store.name} is back to draft and no longer publicly reachable.`,
      actions,
      usage: NO_USAGE,
    }
    return
  }

  if (intent.kind === 'recolor') {
    const { action } = await executeTool(store.id, 'set_brand_and_theme', { palette: intent.palette })
    if (action) {
      actions.push(action)
      yield { type: 'action', action }
    }
    yield {
      type: 'done',
      message: `Switched the palette to ${intent.label}. Add an API key for edits more specific than this.`,
      actions,
      usage: NO_USAGE,
    }
    return
  }

  yield {
    type: 'done',
    message: 'The local planner only handles building a new store, recolouring it, and publishing. '
      + 'Set ANTHROPIC_API_KEY in your .env and restart to have Claude handle requests like this one.',
    actions: [],
    usage: NO_USAGE,
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

/**
 * Works out what to call the store.
 *
 * A name in the prompt wins, then whatever the merchant already typed when
 * creating the store — renaming a store they deliberately named, while its URL
 * keeps the original slug, is worse than a duller name. The kit's suggestion is
 * only for stores still on the placeholder name.
 */
function deriveName(message: string, kit: NicheKit, currentName: string): string {
  const quoted = message.match(/["“']([^"”']{2,40})["”']/)
  if (quoted?.[1]) return titleCase(quoted[1])

  const called = message.match(/\b(?:called|named)\s+([A-Za-z0-9&'’\- ]{2,40})/i)
  if (called?.[1]) return titleCase(called[1].replace(/\s+(that|which|who|and|selling|with).*$/i, '').trim())

  const named = currentName.trim()
  if (named && !/^untitled store$/i.test(named)) return named

  return kit.nameParts.join(' ')
}

function titleCase(input: string): string {
  return input.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * The ordered tool calls that make up a full build.
 *
 * Returning descriptions rather than executing lets the caller await each one
 * and stream its result, and makes the sequence trivially testable.
 */
interface BuildStep { tool: string, input: Record<string, unknown> }

function buildSteps(store: StoreRecord, kit: NicheKit, name: string): BuildStep[] {
  const heroHandles = kit.products.slice(0, 3).map(p => slugify(p.title))

  return [
    {
      tool: 'set_brand_and_theme',
      input: {
        name,
        tagline: kit.tagline,
        announcement: kit.announcement,
        palette: kit.theme.palette,
        fonts: kit.theme.fonts,
        radius: kit.theme.radius,
        density: kit.theme.density,
        buttonStyle: kit.theme.buttonStyle,
      },
    },
    {
      tool: 'add_products',
      input: {
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
      },
    },
    {
      tool: 'upsert_page',
      input: {
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
      },
    },
    {
      tool: 'upsert_page',
      input: {
        path: '/products',
        title: 'Everything we make',
        navLabel: 'Shop',
        navOrder: 1,
        sections: [
          { type: 'rich_text', heading: 'Everything we make', body: kit.about, align: 'center' },
          { type: 'featured_products', limit: 50, columns: 3 },
          { type: 'newsletter', heading: 'New arrivals, occasionally', body: 'A short email when something genuinely new lands. Usually monthly, never more.', buttonLabel: 'Subscribe' },
        ],
      },
    },
    {
      tool: 'upsert_page',
      input: {
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
      },
    },
    {
      tool: 'update_settings',
      input: {
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
      },
    },
  ]
}
