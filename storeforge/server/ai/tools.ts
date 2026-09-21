import type Anthropic from '@anthropic-ai/sdk'
import type { BuildAction, Section, StoreRecord, Theme } from '#shared/types'
import { parseMoney } from '#shared/money'
import { artworkUrl } from '../utils/artwork'
import { slugify } from '../utils/slug'
import {
  deletePage, deleteProduct, getStore, listPages, listProducts,
  upsertPage, upsertProduct, updateStore,
} from '../db/repo'

/**
 * The builder's action surface.
 *
 * These tool definitions are the only way the model changes a store — there is
 * no free-form code generation. That keeps generated stores guaranteed-valid
 * and renderable, and means a bad generation is always recoverable.
 */

const SECTION_SCHEMA = {
  type: 'object',
  description: 'One section of a page. Fields depend on `type`.',
  properties: {
    type: {
      type: 'string',
      enum: [
        'hero', 'featured_products', 'rich_text', 'feature_grid', 'testimonials',
        'gallery', 'faq', 'cta_banner', 'newsletter', 'logo_cloud',
      ],
    },
    eyebrow: { type: 'string', description: 'hero: small label above the heading' },
    heading: { type: 'string' },
    subheading: { type: 'string' },
    body: { type: 'string', description: 'rich_text/cta_banner/newsletter: paragraph copy' },
    ctaLabel: { type: 'string' },
    ctaHref: { type: 'string', description: 'Relative path such as /products or /p/handle' },
    secondaryCtaLabel: { type: 'string' },
    secondaryCtaHref: { type: 'string' },
    buttonLabel: { type: 'string' },
    layout: { type: 'string', enum: ['center', 'split', 'minimal'], description: 'hero only' },
    align: { type: 'string', enum: ['left', 'center'], description: 'rich_text only' },
    columns: { type: 'integer', enum: [2, 3, 4], description: 'featured_products only' },
    limit: { type: 'integer', description: 'featured_products: max products to show' },
    handles: {
      type: 'array', items: { type: 'string' },
      description: 'featured_products: specific product handles. Omit to show the newest products.',
    },
    collection: { type: 'string', description: 'featured_products: filter by collection name' },
    items: {
      type: 'array',
      description: 'feature_grid: [{title, body, icon}] · testimonials: [{quote, author, role}] · faq: [{question, answer}] · logo_cloud: ["Name", ...]',
      items: {},
    },
    images: { type: 'array', items: { type: 'string' }, description: 'gallery: image descriptions; artwork is generated from each' },
  },
  required: ['type'],
} as const

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'get_store_state',
    description:
      'Read the current state of the store: brand, theme, settings, every page with its sections, and every product. '
      + 'Call this first when the user asks to change or extend something that already exists, so you edit rather than clobber.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'set_brand_and_theme',
    description:
      'Set the store name, tagline and visual design. Choose a palette that genuinely fits the niche — a skincare brand '
      + 'and a skate shop should not look alike. Colors are hex strings. Ensure text on background and onPrimary on '
      + 'primary both stay comfortably readable.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Store name' },
        tagline: { type: 'string', description: 'Short positioning line, under ~70 characters' },
        announcement: { type: 'string', description: 'Optional announcement bar text, e.g. free shipping offer' },
        palette: {
          type: 'object',
          properties: {
            primary: { type: 'string' }, onPrimary: { type: 'string' },
            background: { type: 'string' }, surface: { type: 'string' },
            text: { type: 'string' }, muted: { type: 'string' },
            border: { type: 'string' }, accent: { type: 'string' },
          },
        },
        fonts: {
          type: 'object',
          properties: {
            heading: { type: 'string', description: 'CSS font stack, e.g. "Georgia, serif"' },
            body: { type: 'string', description: 'CSS font stack' },
          },
        },
        radius: { type: 'string', enum: ['none', 'sm', 'md', 'lg', 'full'] },
        density: { type: 'string', enum: ['compact', 'comfortable', 'airy'] },
        buttonStyle: { type: 'string', enum: ['solid', 'outline', 'pill'] },
      },
      required: [],
    },
  },
  {
    name: 'upsert_page',
    description:
      'Create or replace a page and all of its sections. The section list you pass replaces the page entirely, so when '
      + 'editing an existing page include the sections you want to keep. Path "/" is the home page.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Page path starting with "/", e.g. "/" or "/about"' },
        title: { type: 'string', description: 'Page title used in the browser tab' },
        navLabel: { type: 'string', description: 'Label in the storefront nav. Omit to keep the page out of the nav.' },
        navOrder: { type: 'integer', description: 'Lower sorts first in the nav' },
        sections: { type: 'array', items: SECTION_SCHEMA },
      },
      required: ['path', 'title', 'sections'],
    },
  },
  {
    name: 'delete_page',
    description: 'Remove a page. The home page cannot be deleted.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'add_products',
    description:
      'Create or update products in bulk. Write real merchandising copy — specific, concrete descriptions, not filler. '
      + 'Prices are in the store currency as decimal strings or numbers ("24.00" or 24). Product artwork is generated '
      + 'automatically from the title, so no image URLs are needed.',
    input_schema: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              handle: { type: 'string', description: 'URL slug. Omit to derive it from the title.' },
              description: { type: 'string', description: 'Two to four sentences of product copy' },
              price: { type: ['string', 'number'] },
              compareAtPrice: { type: ['string', 'number'], description: 'Optional was-price for showing a discount' },
              inventory: { type: 'integer' },
              collection: { type: 'string', description: 'Optional grouping name, e.g. "Bestsellers"' },
              tags: { type: 'array', items: { type: 'string' } },
              variants: {
                type: 'array',
                description: 'Optional variants, e.g. sizes or scents',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    price: { type: ['string', 'number'], description: 'Omit to inherit the product price' },
                    sku: { type: 'string' },
                    inventory: { type: 'integer' },
                  },
                  required: ['title'],
                },
              },
            },
            required: ['title', 'price'],
          },
        },
      },
      required: ['products'],
    },
  },
  {
    name: 'delete_product',
    description: 'Remove a product by handle.',
    input_schema: {
      type: 'object',
      properties: { handle: { type: 'string' } },
      required: ['handle'],
    },
  },
  {
    name: 'update_settings',
    description: 'Update commerce settings: currency, shipping, tax, support email, footer and social links.',
    input_schema: {
      type: 'object',
      properties: {
        currency: { type: 'string', description: 'ISO code such as USD, EUR, GBP' },
        shippingFlat: { type: ['string', 'number'], description: 'Flat shipping rate' },
        freeShippingThreshold: { type: ['string', 'number'], description: 'Order total above which shipping is free. Use 0 to disable.' },
        taxRatePercent: { type: 'number', description: 'Tax rate as a percentage, e.g. 8.5' },
        supportEmail: { type: 'string' },
        footerLinks: {
          type: 'array',
          items: { type: 'object', properties: { label: { type: 'string' }, href: { type: 'string' } }, required: ['label', 'href'] },
        },
        socialLinks: {
          type: 'array',
          items: { type: 'object', properties: { label: { type: 'string' }, href: { type: 'string' } }, required: ['label', 'href'] },
        },
      },
      required: [],
    },
  },
  {
    name: 'publish_store',
    description: 'Publish the store so its public storefront is live, or unpublish it back to draft.',
    input_schema: {
      type: 'object',
      properties: { published: { type: 'boolean' } },
      required: ['published'],
    },
  },
]

export interface ToolOutcome {
  result: unknown
  action?: BuildAction
}

type AnyRecord = Record<string, any>

/** Runs one tool call against a store. Throws only on programmer error; tool-level problems come back as `{error}`. */
export function executeTool(storeId: string, name: string, rawInput: unknown): ToolOutcome {
  const input = (rawInput ?? {}) as AnyRecord

  switch (name) {
    case 'get_store_state':
      return { result: readState(storeId) }
    case 'set_brand_and_theme':
      return setBrandAndTheme(storeId, input)
    case 'upsert_page':
      return doUpsertPage(storeId, input)
    case 'delete_page':
      return doDeletePage(storeId, input)
    case 'add_products':
      return doAddProducts(storeId, input)
    case 'delete_product':
      return doDeleteProduct(storeId, input)
    case 'update_settings':
      return doUpdateSettings(storeId, input)
    case 'publish_store':
      return doPublish(storeId, input)
    default:
      return { result: { error: `Unknown tool "${name}"` } }
  }
}

function readState(storeId: string) {
  const store = getStore(storeId)
  if (!store) return { error: 'Store not found' }
  return {
    brand: store.brand,
    theme: store.theme,
    settings: store.settings,
    status: store.status,
    pages: listPages(storeId).map(p => ({
      path: p.path,
      title: p.title,
      navLabel: p.navLabel,
      sections: p.sections.map(s => ({ type: s.type, heading: (s as AnyRecord).heading })),
    })),
    products: listProducts(storeId).map(p => ({
      handle: p.handle,
      title: p.title,
      price: (p.priceCents / 100).toFixed(2),
      collection: p.collection,
      inventory: p.inventory,
      variants: p.variants.map(v => v.title),
    })),
  }
}

function setBrandAndTheme(storeId: string, input: AnyRecord): ToolOutcome {
  const store = getStore(storeId)
  if (!store) return { result: { error: 'Store not found' } }

  const theme: Theme = {
    palette: { ...store.theme.palette, ...pickHexes(input.palette) },
    fonts: {
      heading: str(input.fonts?.heading) ?? store.theme.fonts.heading,
      body: str(input.fonts?.body) ?? store.theme.fonts.body,
    },
    radius: oneOf(input.radius, ['none', 'sm', 'md', 'lg', 'full'] as const, store.theme.radius),
    density: oneOf(input.density, ['compact', 'comfortable', 'airy'] as const, store.theme.density),
    buttonStyle: oneOf(input.buttonStyle, ['solid', 'outline', 'pill'] as const, store.theme.buttonStyle),
  }

  const brand = {
    name: str(input.name) ?? store.brand.name,
    tagline: str(input.tagline) ?? store.brand.tagline,
    logoText: str(input.logoText) ?? store.brand.logoText,
    announcement: str(input.announcement) ?? store.brand.announcement,
  }

  updateStore(storeId, { brand, theme, name: brand.name })

  return {
    result: { ok: true, brand, theme },
    action: {
      tool: 'set_brand_and_theme',
      summary: `Styled “${brand.name}”`,
      detail: [brand.tagline, `${theme.palette.primary} · ${theme.fonts.heading.split(',')[0]}`]
        .filter(Boolean).join(' — '),
    },
  }
}

function doUpsertPage(storeId: string, input: AnyRecord): ToolOutcome {
  const path = normalizePath(str(input.path) ?? '/')
  const title = str(input.title) ?? 'Untitled page'
  const rawSections = Array.isArray(input.sections) ? input.sections : []
  const sections = rawSections
    .map((s, i) => normalizeSection(s as AnyRecord, i))
    .filter((s): s is Section => s !== null)

  const page = upsertPage({
    storeId,
    path,
    title,
    sections,
    isHome: path === '/',
    navLabel: input.navLabel === undefined ? undefined : (str(input.navLabel) ?? null),
    navOrder: Number.isFinite(input.navOrder) ? Number(input.navOrder) : undefined,
  })

  return {
    result: { ok: true, path: page.path, sectionCount: sections.length },
    action: {
      tool: 'upsert_page',
      summary: `Built ${path === '/' ? 'the home page' : path}`,
      detail: sections.map(s => s.type.replace(/_/g, ' ')).join(' · '),
    },
  }
}

function doDeletePage(storeId: string, input: AnyRecord): ToolOutcome {
  const path = normalizePath(str(input.path) ?? '')
  if (path === '/') return { result: { error: 'The home page cannot be deleted' } }
  deletePage(storeId, path)
  return {
    result: { ok: true },
    action: { tool: 'delete_page', summary: `Removed ${path}` },
  }
}

function doAddProducts(storeId: string, input: AnyRecord): ToolOutcome {
  const items = Array.isArray(input.products) ? input.products : []
  if (!items.length) return { result: { error: 'No products supplied' } }

  const created: string[] = []
  for (const raw of items as AnyRecord[]) {
    const title = str(raw.title)
    if (!title) continue

    const handle = slugify(str(raw.handle) ?? title)
    const priceCents = parseMoney(raw.price ?? 0)
    const compareRaw = raw.compareAtPrice ?? raw.compareAt
    const compareAtCents = compareRaw != null ? parseMoney(compareRaw) : null

    upsertProduct(storeId, {
      handle,
      title,
      description: str(raw.description) ?? '',
      priceCents,
      // A "was" price below the current price would render as a nonsense discount.
      compareAtCents: compareAtCents && compareAtCents > priceCents ? compareAtCents : null,
      image: artworkUrl(`${storeId}:${handle}`, title, 'product'),
      status: 'active',
      inventory: Number.isFinite(raw.inventory) ? Number(raw.inventory) : 100,
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      collection: str(raw.collection) ?? null,
      variants: Array.isArray(raw.variants)
        ? (raw.variants as AnyRecord[])
            .filter(v => str(v.title))
            .map(v => ({
              title: str(v.title)!,
              priceCents: v.price != null ? parseMoney(v.price) : null,
              sku: str(v.sku) ?? null,
              inventory: Number.isFinite(v.inventory) ? Number(v.inventory) : 50,
            }))
        : undefined,
    })
    created.push(title)
  }

  return {
    result: { ok: true, count: created.length, titles: created },
    action: {
      tool: 'add_products',
      summary: `Added ${created.length} product${created.length === 1 ? '' : 's'}`,
      detail: created.slice(0, 6).join(', ') + (created.length > 6 ? `, +${created.length - 6} more` : ''),
    },
  }
}

function doDeleteProduct(storeId: string, input: AnyRecord): ToolOutcome {
  const handle = str(input.handle)
  if (!handle) return { result: { error: 'handle is required' } }
  const removed = deleteProduct(storeId, handle)
  return {
    result: { ok: removed, removed },
    action: removed ? { tool: 'delete_product', summary: `Removed product “${handle}”` } : undefined,
  }
}

function doUpdateSettings(storeId: string, input: AnyRecord): ToolOutcome {
  const store = getStore(storeId)
  if (!store) return { result: { error: 'Store not found' } }

  const s = store.settings
  const threshold = input.freeShippingThreshold != null ? parseMoney(input.freeShippingThreshold) : undefined

  const settings = {
    currency: (str(input.currency) ?? s.currency).toUpperCase().slice(0, 3),
    shippingFlatCents: input.shippingFlat != null ? parseMoney(input.shippingFlat) : s.shippingFlatCents,
    freeShippingThresholdCents: threshold === undefined ? s.freeShippingThresholdCents : (threshold > 0 ? threshold : null),
    taxRateBps: Number.isFinite(input.taxRatePercent) ? Math.round(Number(input.taxRatePercent) * 100) : s.taxRateBps,
    supportEmail: str(input.supportEmail) ?? s.supportEmail,
    footerLinks: normalizeLinks(input.footerLinks) ?? s.footerLinks,
    socialLinks: normalizeLinks(input.socialLinks) ?? s.socialLinks,
  }

  updateStore(storeId, { settings })
  return {
    result: { ok: true, settings },
    action: { tool: 'update_settings', summary: 'Updated store settings' },
  }
}

function doPublish(storeId: string, input: AnyRecord): ToolOutcome {
  const published = input.published !== false
  const store = updateStore(storeId, { status: published ? 'published' : 'draft' })
  return {
    result: { ok: true, status: store?.status },
    action: {
      tool: 'publish_store',
      summary: published ? 'Published the storefront' : 'Moved the storefront back to draft',
    },
  }
}

/* -------------------------------------------------------------- normalizing */

function str(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const trimmed = v.trim()
  return trimmed ? trimmed : undefined
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? v as T : fallback
}

function pickHexes(palette: unknown): Partial<Theme['palette']> {
  if (!palette || typeof palette !== 'object') return {}
  const out: AnyRecord = {}
  for (const [key, value] of Object.entries(palette as AnyRecord)) {
    if (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value.trim())) {
      out[key] = value.trim()
    }
  }
  return out as Partial<Theme['palette']>
}

function normalizePath(path: string): string {
  if (!path || path === '/') return '/'
  const cleaned = '/' + path.replace(/^\/+|\/+$/g, '').toLowerCase().replace(/[^a-z0-9/-]+/g, '-')
  return cleaned === '/' ? '/' : cleaned
}

function normalizeLinks(value: unknown): Array<{ label: string, href: string }> | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map((l: AnyRecord) => ({ label: str(l?.label) ?? '', href: str(l?.href) ?? '' }))
    .filter(l => l.label && l.href)
}

/**
 * Coerces a model-authored section into a renderable one.
 *
 * The model occasionally puts items in the wrong shape (a string where an
 * object belongs, `q`/`a` instead of `question`/`answer`). Repairing here beats
 * failing the whole build, and unrepairable sections are dropped rather than
 * rendered broken.
 */
function normalizeSection(raw: AnyRecord, index: number): Section | null {
  const type = str(raw?.type) as Section['type'] | undefined
  if (!type) return null
  const id = `s${index}-${type}`
  const items: AnyRecord[] = Array.isArray(raw.items) ? raw.items : []

  switch (type) {
    case 'hero':
      return {
        id, type,
        eyebrow: str(raw.eyebrow),
        heading: str(raw.heading) ?? 'Welcome',
        subheading: str(raw.subheading),
        ctaLabel: str(raw.ctaLabel),
        ctaHref: str(raw.ctaHref) ?? '/products',
        secondaryCtaLabel: str(raw.secondaryCtaLabel),
        secondaryCtaHref: str(raw.secondaryCtaHref),
        image: str(raw.image),
        layout: oneOf(raw.layout, ['center', 'split', 'minimal'] as const, 'split'),
      }

    case 'featured_products':
      return {
        id, type,
        heading: str(raw.heading),
        subheading: str(raw.subheading),
        handles: Array.isArray(raw.handles) ? raw.handles.map(String) : undefined,
        collection: str(raw.collection),
        limit: Number.isFinite(raw.limit) ? Number(raw.limit) : 8,
        columns: ([2, 3, 4].includes(Number(raw.columns)) ? Number(raw.columns) : 3) as 2 | 3 | 4,
      }

    case 'rich_text': {
      const body = str(raw.body) ?? str(raw.text) ?? str(raw.content)
      if (!body) return null
      return { id, type, heading: str(raw.heading), body, align: oneOf(raw.align, ['left', 'center'] as const, 'left') }
    }

    case 'feature_grid': {
      const mapped = items
        .map(i => ({
          icon: str(i?.icon),
          title: str(i?.title) ?? str(i?.heading) ?? '',
          body: str(i?.body) ?? str(i?.description) ?? str(i?.text) ?? '',
        }))
        .filter(i => i.title)
      if (!mapped.length) return null
      return { id, type, heading: str(raw.heading), subheading: str(raw.subheading), items: mapped }
    }

    case 'testimonials': {
      const mapped = items
        .map(i => ({
          quote: str(i?.quote) ?? str(i?.body) ?? str(i?.text) ?? '',
          author: str(i?.author) ?? str(i?.name) ?? 'Verified buyer',
          role: str(i?.role) ?? str(i?.title),
        }))
        .filter(i => i.quote)
      if (!mapped.length) return null
      return { id, type, heading: str(raw.heading), items: mapped }
    }

    case 'faq': {
      const mapped = items
        .map(i => ({
          question: str(i?.question) ?? str(i?.q) ?? '',
          answer: str(i?.answer) ?? str(i?.a) ?? '',
        }))
        .filter(i => i.question && i.answer)
      if (!mapped.length) return null
      return { id, type, heading: str(raw.heading), items: mapped }
    }

    case 'gallery': {
      const images = Array.isArray(raw.images) ? raw.images.map(String).filter(Boolean) : []
      if (!images.length) return null
      return { id, type, heading: str(raw.heading), images }
    }

    case 'cta_banner':
      return {
        id, type,
        heading: str(raw.heading) ?? 'Ready when you are',
        body: str(raw.body),
        ctaLabel: str(raw.ctaLabel) ?? 'Shop now',
        ctaHref: str(raw.ctaHref) ?? '/products',
      }

    case 'newsletter':
      return {
        id, type,
        heading: str(raw.heading) ?? 'Stay in the loop',
        body: str(raw.body),
        buttonLabel: str(raw.buttonLabel) ?? 'Subscribe',
      }

    case 'logo_cloud': {
      const names = (Array.isArray(raw.items) ? raw.items : [])
        .map((i: unknown) => typeof i === 'string' ? i : str((i as AnyRecord)?.title) ?? str((i as AnyRecord)?.name) ?? '')
        .filter(Boolean)
      if (!names.length) return null
      return { id, type, heading: str(raw.heading), items: names }
    }

    default:
      return null
  }
}

export type { StoreRecord }
