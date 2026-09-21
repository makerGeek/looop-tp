import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import type {
  Brand, CartLine, ChatMessageRecord, OrderRecord, PageRecord,
  ProductRecord, Section, StoreRecord, StoreSettings, Theme,
} from '#shared/types'
import { useDb } from './index'
import {
  carts, chatMessages, memberships, orders, organizations, pages,
  products, stores, variants, type Role,
} from './schema'

export const newId = () => randomUUID()

/* ---------------------------------------------------------------- stores */

export function defaultTheme(): Theme {
  return {
    palette: {
      primary: '#111827', onPrimary: '#ffffff', background: '#ffffff',
      surface: '#f9fafb', text: '#111827', muted: '#6b7280',
      border: '#e5e7eb', accent: '#4f46e5',
    },
    fonts: { heading: 'Georgia, serif', body: 'system-ui, sans-serif' },
    radius: 'md',
    density: 'comfortable',
    buttonStyle: 'solid',
  }
}

export function defaultSettings(): StoreSettings {
  return {
    currency: 'USD',
    shippingFlatCents: 599,
    freeShippingThresholdCents: 7500,
    taxRateBps: 0,
    footerLinks: [],
    socialLinks: [],
  }
}

type StoreRow = typeof stores.$inferSelect

function mapStore(row: StoreRow): StoreRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    slug: row.slug,
    status: row.status,
    brand: row.brand,
    theme: row.theme,
    settings: row.settings,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function createStore(orgId: string, name: string, slug: string): Promise<StoreRecord> {
  const [row] = await useDb().insert(stores).values({
    id: newId(),
    orgId,
    name,
    slug,
    status: 'draft',
    brand: { name } satisfies Brand,
    theme: defaultTheme(),
    settings: defaultSettings(),
  }).returning()

  return mapStore(row!)
}

export async function listStoresForOrg(orgId: string): Promise<StoreRecord[]> {
  const rows = await useDb().select().from(stores)
    .where(eq(stores.orgId, orgId))
    .orderBy(desc(stores.updatedAt))
  return rows.map(mapStore)
}

export async function countStoresForOrg(orgId: string): Promise<number> {
  const [row] = await useDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(stores)
    .where(eq(stores.orgId, orgId))
  return row?.n ?? 0
}

export async function getStore(id: string): Promise<StoreRecord | undefined> {
  const [row] = await useDb().select().from(stores).where(eq(stores.id, id)).limit(1)
  return row ? mapStore(row) : undefined
}

export async function getStoreBySlug(slug: string): Promise<StoreRecord | undefined> {
  const [row] = await useDb().select().from(stores).where(eq(stores.slug, slug)).limit(1)
  return row ? mapStore(row) : undefined
}

export async function slugExists(slug: string): Promise<boolean> {
  const [row] = await useDb().select({ id: stores.id }).from(stores).where(eq(stores.slug, slug)).limit(1)
  return !!row
}

export async function updateStore(
  id: string,
  patch: Partial<Pick<StoreRecord, 'name' | 'status' | 'brand' | 'theme' | 'settings'>>,
): Promise<StoreRecord | undefined> {
  const [row] = await useDb().update(stores)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(stores.id, id))
    .returning()
  return row ? mapStore(row) : undefined
}

export async function deleteStore(id: string): Promise<void> {
  await useDb().delete(stores).where(eq(stores.id, id))
}

async function touchStore(storeId: string): Promise<void> {
  await useDb().update(stores).set({ updatedAt: new Date() }).where(eq(stores.id, storeId))
}

/* ----------------------------------------------------------------- pages */

type PageRow = typeof pages.$inferSelect

const mapPage = (row: PageRow): PageRecord => ({
  id: row.id,
  storeId: row.storeId,
  path: row.path,
  title: row.title,
  sections: row.sections,
  isHome: row.isHome,
  navLabel: row.navLabel,
  navOrder: row.navOrder,
})

export async function listPages(storeId: string): Promise<PageRecord[]> {
  const rows = await useDb().select().from(pages)
    .where(eq(pages.storeId, storeId))
    .orderBy(desc(pages.isHome), asc(pages.navOrder), asc(pages.title))
  return rows.map(mapPage)
}

export async function getPage(storeId: string, path: string): Promise<PageRecord | undefined> {
  const [row] = await useDb().select().from(pages)
    .where(and(eq(pages.storeId, storeId), eq(pages.path, path)))
    .limit(1)
  return row ? mapPage(row) : undefined
}

export async function upsertPage(page: {
  storeId: string, path: string, title: string, sections: Section[]
  isHome?: boolean, navLabel?: string | null, navOrder?: number
}): Promise<PageRecord> {
  const db = useDb()
  const existing = await getPage(page.storeId, page.path)
  const isHome = page.isHome ?? existing?.isHome ?? page.path === '/'

  const values = {
    id: existing?.id ?? newId(),
    storeId: page.storeId,
    path: page.path,
    title: page.title,
    sections: page.sections,
    isHome,
    navLabel: page.navLabel !== undefined ? page.navLabel : (existing?.navLabel ?? null),
    navOrder: page.navOrder ?? existing?.navOrder ?? 0,
  }

  if (isHome) {
    // Exactly one page per store is the home page.
    await db.update(pages).set({ isHome: false })
      .where(and(eq(pages.storeId, page.storeId), ne(pages.path, page.path)))
  }

  const [row] = await db.insert(pages).values(values)
    .onConflictDoUpdate({
      target: [pages.storeId, pages.path],
      set: {
        title: values.title,
        sections: values.sections,
        isHome: values.isHome,
        navLabel: values.navLabel,
        navOrder: values.navOrder,
      },
    })
    .returning()

  await touchStore(page.storeId)
  return mapPage(row!)
}

export async function deletePage(storeId: string, path: string): Promise<void> {
  await useDb().delete(pages)
    .where(and(eq(pages.storeId, storeId), eq(pages.path, path), eq(pages.isHome, false)))
  await touchStore(storeId)
}

/* -------------------------------------------------------------- products */

type ProductRow = typeof products.$inferSelect
type VariantRow = typeof variants.$inferSelect

function mapProduct(row: ProductRow, rows: VariantRow[]): ProductRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    handle: row.handle,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    image: row.image,
    status: row.status,
    inventory: row.inventory,
    tags: row.tags,
    collection: row.collection,
    createdAt: row.createdAt.toISOString(),
    variants: rows.map(v => ({
      id: v.id,
      productId: v.productId,
      title: v.title,
      priceCents: v.priceCents,
      sku: v.sku,
      inventory: v.inventory,
    })),
  }
}

/** Loads variants for many products in one query, avoiding an N+1 on the grid. */
async function variantsFor(productIds: string[]): Promise<Map<string, VariantRow[]>> {
  const map = new Map<string, VariantRow[]>()
  if (!productIds.length) return map

  const rows = await useDb().select().from(variants)
    .where(inArray(variants.productId, productIds))
    .orderBy(asc(variants.position))

  for (const row of rows) {
    const list = map.get(row.productId) ?? []
    list.push(row)
    map.set(row.productId, list)
  }
  return map
}

export async function listProducts(
  storeId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<ProductRecord[]> {
  const where = opts.activeOnly
    ? and(eq(products.storeId, storeId), eq(products.status, 'active'))
    : eq(products.storeId, storeId)

  const rows = await useDb().select().from(products).where(where).orderBy(asc(products.createdAt))
  const byProduct = await variantsFor(rows.map(r => r.id))
  return rows.map(r => mapProduct(r, byProduct.get(r.id) ?? []))
}

export async function getProduct(storeId: string, handle: string): Promise<ProductRecord | undefined> {
  const [row] = await useDb().select().from(products)
    .where(and(eq(products.storeId, storeId), eq(products.handle, handle)))
    .limit(1)
  if (!row) return undefined

  const byProduct = await variantsFor([row.id])
  return mapProduct(row, byProduct.get(row.id) ?? [])
}

export interface ProductInput {
  handle: string
  title: string
  description?: string
  priceCents: number
  compareAtCents?: number | null
  image?: string | null
  status?: 'active' | 'draft'
  inventory?: number
  tags?: string[]
  collection?: string | null
  variants?: Array<{ title: string, priceCents?: number | null, sku?: string | null, inventory?: number }>
}

export async function upsertProduct(storeId: string, input: ProductInput): Promise<ProductRecord> {
  const db = useDb()
  const existing = await getProduct(storeId, input.handle)
  const id = existing?.id ?? newId()

  await db.insert(products).values({
    id,
    storeId,
    handle: input.handle,
    title: input.title,
    description: input.description ?? existing?.description ?? '',
    priceCents: input.priceCents,
    compareAtCents: input.compareAtCents ?? null,
    image: input.image ?? existing?.image ?? null,
    status: input.status ?? existing?.status ?? 'active',
    inventory: input.inventory ?? existing?.inventory ?? 100,
    tags: input.tags ?? existing?.tags ?? [],
    collection: input.collection ?? existing?.collection ?? null,
  }).onConflictDoUpdate({
    target: [products.storeId, products.handle],
    set: {
      title: input.title,
      description: input.description ?? existing?.description ?? '',
      priceCents: input.priceCents,
      compareAtCents: input.compareAtCents ?? null,
      image: input.image ?? existing?.image ?? null,
      status: input.status ?? existing?.status ?? 'active',
      inventory: input.inventory ?? existing?.inventory ?? 100,
      tags: input.tags ?? existing?.tags ?? [],
      collection: input.collection ?? existing?.collection ?? null,
    },
  })

  if (input.variants) {
    await db.delete(variants).where(eq(variants.productId, id))
    if (input.variants.length) {
      await db.insert(variants).values(input.variants.map((v, i) => ({
        id: newId(),
        productId: id,
        title: v.title,
        priceCents: v.priceCents ?? null,
        sku: v.sku ?? null,
        inventory: v.inventory ?? 50,
        position: i,
      })))
    }
  }

  await touchStore(storeId)
  return (await getProduct(storeId, input.handle))!
}

export async function deleteProduct(storeId: string, handle: string): Promise<boolean> {
  const rows = await useDb().delete(products)
    .where(and(eq(products.storeId, storeId), eq(products.handle, handle)))
    .returning({ id: products.id })
  await touchStore(storeId)
  return rows.length > 0
}

export async function decrementInventory(productId: string, variantId: string | null, qty: number): Promise<void> {
  const db = useDb()
  if (variantId) {
    await db.update(variants)
      .set({ inventory: sql`GREATEST(0, ${variants.inventory} - ${qty})` })
      .where(eq(variants.id, variantId))
  }
  await db.update(products)
    .set({ inventory: sql`GREATEST(0, ${products.inventory} - ${qty})` })
    .where(eq(products.id, productId))
}

/* ----------------------------------------------------------------- carts */

export async function getOrCreateCart(
  storeId: string,
  token: string | undefined,
): Promise<{ token: string, lines: CartLine[] }> {
  const db = useDb()

  if (token) {
    const [row] = await db.select().from(carts)
      .where(and(eq(carts.token, token), eq(carts.storeId, storeId)))
      .limit(1)
    if (row) return { token: row.token, lines: row.lines }
  }

  const fresh = randomUUID().replace(/-/g, '')
  await db.insert(carts).values({ id: newId(), storeId, token: fresh, lines: [] })
  return { token: fresh, lines: [] }
}

export async function saveCart(storeId: string, token: string, lines: CartLine[]): Promise<void> {
  await useDb().update(carts)
    .set({ lines, updatedAt: new Date() })
    .where(and(eq(carts.token, token), eq(carts.storeId, storeId)))
}

export const clearCart = (storeId: string, token: string) => saveCart(storeId, token, [])

/* ---------------------------------------------------------------- orders */

type OrderRow = typeof orders.$inferSelect

const mapOrder = (row: OrderRow): OrderRecord => ({
  id: row.id,
  storeId: row.storeId,
  number: row.number,
  email: row.email,
  status: row.status,
  lines: row.lines,
  totals: row.totals,
  currency: row.currency,
  shipping: row.shipping,
  paymentRef: row.paymentRef,
  createdAt: row.createdAt.toISOString(),
})

export async function createOrder(
  order: Omit<OrderRecord, 'id' | 'number' | 'createdAt'>,
): Promise<OrderRecord> {
  const db = useDb()

  // Order numbers are sequential per store, which means two concurrent
  // checkouts can read the same MAX(number) before either commits. The unique
  // index on (store_id, number) is what actually guarantees uniqueness; this
  // loop just picks a new number when it loses the race.
  //
  // `onConflictDoNothing` rather than catching an exception: the driver wraps
  // Postgres errors, so matching on the message is fragile — an empty result
  // is an unambiguous signal.
  for (let attempt = 0; attempt < 8; attempt++) {
    const [current] = await db
      .select({ next: sql<number>`COALESCE(MAX(${orders.number}), 1000) + 1` })
      .from(orders)
      .where(eq(orders.storeId, order.storeId))

    const [row] = await db.insert(orders).values({
      id: newId(),
      storeId: order.storeId,
      number: current?.next ?? 1001,
      email: order.email,
      status: order.status,
      lines: order.lines,
      totals: order.totals,
      currency: order.currency,
      shipping: order.shipping,
      paymentRef: order.paymentRef,
    })
      .onConflictDoNothing({ target: [orders.storeId, orders.number] })
      .returning()

    if (row) return mapOrder(row)

    // Small jittered backoff so a burst of checkouts fans out instead of
    // colliding on the same number repeatedly.
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 20))
  }

  throw createError({
    statusCode: 503,
    statusMessage: 'The store is busy right now — please try again in a moment.',
  })
}

export async function listOrders(storeId: string): Promise<OrderRecord[]> {
  const rows = await useDb().select().from(orders)
    .where(eq(orders.storeId, storeId))
    .orderBy(desc(orders.number))
  return rows.map(mapOrder)
}

export async function getOrder(storeId: string, id: string): Promise<OrderRecord | undefined> {
  const [row] = await useDb().select().from(orders)
    .where(and(eq(orders.storeId, storeId), eq(orders.id, id)))
    .limit(1)
  return row ? mapOrder(row) : undefined
}

export async function setOrderStatus(
  storeId: string,
  id: string,
  status: OrderRecord['status'],
): Promise<OrderRecord | undefined> {
  const [row] = await useDb().update(orders)
    .set({ status })
    .where(and(eq(orders.storeId, storeId), eq(orders.id, id)))
    .returning()
  return row ? mapOrder(row) : undefined
}

/* ------------------------------------------------------------------ chat */

export async function appendChat(
  storeId: string,
  role: 'user' | 'assistant',
  content: string,
  actions: ChatMessageRecord['actions'] = [],
): Promise<ChatMessageRecord> {
  const [row] = await useDb().insert(chatMessages)
    .values({ id: newId(), storeId, role, content, actions })
    .returning()

  return {
    id: row!.id,
    storeId,
    role,
    content,
    actions,
    createdAt: row!.createdAt.toISOString(),
  }
}

export async function listChat(storeId: string, limit = 100): Promise<ChatMessageRecord[]> {
  const rows = await useDb().select().from(chatMessages)
    .where(eq(chatMessages.storeId, storeId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit)

  return rows.map(row => ({
    id: row.id,
    storeId: row.storeId,
    role: row.role,
    content: row.content,
    actions: row.actions,
    createdAt: row.createdAt.toISOString(),
  }))
}

/* ------------------------------------------------------------ membership */

export interface OrgMembership {
  orgId: string
  orgName: string
  orgSlug: string
  role: Role
}

export async function listOrgsForUser(userId: string): Promise<OrgMembership[]> {
  const rows = await useDb()
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(organizations.createdAt))
  return rows
}

export async function getMembership(userId: string, orgId: string): Promise<Role | undefined> {
  const [row] = await useDb().select({ role: memberships.role }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
    .limit(1)
  return row?.role
}
