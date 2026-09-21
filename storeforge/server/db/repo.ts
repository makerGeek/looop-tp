import { randomUUID } from 'node:crypto'
import type {
  Brand, CartLine, ChatMessageRecord, OrderRecord, PageRecord,
  ProductRecord, Section, StoreRecord, StoreSettings, Theme, VariantRecord,
} from '#shared/types'
import { json, useDb } from './index'

export const newId = () => randomUUID()
export const now = () => new Date().toISOString()

/* ------------------------------------------------------------------ users */

export interface UserRow { id: string, email: string, name: string, password_hash: string, created_at: string }

export function createUser(email: string, name: string, passwordHash: string): UserRow {
  const row: UserRow = {
    id: newId(),
    email: email.toLowerCase().trim(),
    name,
    password_hash: passwordHash,
    created_at: now(),
  }
  useDb().prepare(
    'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (@id, @email, @name, @password_hash, @created_at)',
  ).run(row)
  return row
}

export function findUserByEmail(email: string): UserRow | undefined {
  return useDb().prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as UserRow | undefined
}

export function findUserById(id: string): UserRow | undefined {
  return useDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

/* --------------------------------------------------------------- sessions */

export function createSession(userId: string, ttlDays = 30): string {
  const id = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  const expires = new Date(Date.now() + ttlDays * 86_400_000).toISOString()
  useDb().prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(id, userId, expires, now())
  return id
}

export function findSessionUser(sessionId: string): UserRow | undefined {
  const row = useDb().prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
  ).get(sessionId, now()) as UserRow | undefined
  return row
}

export function deleteSession(sessionId: string): void {
  useDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
}

/* ----------------------------------------------------------------- stores */

interface StoreRow {
  id: string, user_id: string, name: string, slug: string, status: string,
  brand: string, theme: string, settings: string, created_at: string, updated_at: string
}

function mapStore(row: StoreRow): StoreRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    status: row.status === 'published' ? 'published' : 'draft',
    brand: json<Brand>(row.brand, { name: row.name }),
    theme: json<Theme>(row.theme, defaultTheme()),
    settings: json<StoreSettings>(row.settings, defaultSettings()),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function defaultTheme(): Theme {
  return {
    palette: {
      primary: '#111827',
      onPrimary: '#ffffff',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      muted: '#6b7280',
      border: '#e5e7eb',
      accent: '#4f46e5',
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

export function createStore(userId: string, name: string, slug: string): StoreRecord {
  const ts = now()
  const row: StoreRow = {
    id: newId(),
    user_id: userId,
    name,
    slug,
    status: 'draft',
    brand: JSON.stringify({ name } satisfies Brand),
    theme: JSON.stringify(defaultTheme()),
    settings: JSON.stringify(defaultSettings()),
    created_at: ts,
    updated_at: ts,
  }
  useDb().prepare(
    `INSERT INTO stores (id, user_id, name, slug, status, brand, theme, settings, created_at, updated_at)
     VALUES (@id, @user_id, @name, @slug, @status, @brand, @theme, @settings, @created_at, @updated_at)`,
  ).run(row)
  return mapStore(row)
}

export function listStores(userId: string): StoreRecord[] {
  const rows = useDb().prepare('SELECT * FROM stores WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as StoreRow[]
  return rows.map(mapStore)
}

export function getStore(id: string): StoreRecord | undefined {
  const row = useDb().prepare('SELECT * FROM stores WHERE id = ?').get(id) as StoreRow | undefined
  return row ? mapStore(row) : undefined
}

export function getStoreBySlug(slug: string): StoreRecord | undefined {
  const row = useDb().prepare('SELECT * FROM stores WHERE slug = ?').get(slug) as StoreRow | undefined
  return row ? mapStore(row) : undefined
}

export function slugExists(slug: string): boolean {
  return !!useDb().prepare('SELECT 1 FROM stores WHERE slug = ?').get(slug)
}

export function updateStore(
  id: string,
  patch: Partial<Pick<StoreRecord, 'name' | 'status' | 'brand' | 'theme' | 'settings'>>,
): StoreRecord | undefined {
  const current = getStore(id)
  if (!current) return undefined

  const merged = {
    name: patch.name ?? current.name,
    status: patch.status ?? current.status,
    brand: JSON.stringify(patch.brand ?? current.brand),
    theme: JSON.stringify(patch.theme ?? current.theme),
    settings: JSON.stringify(patch.settings ?? current.settings),
    updated_at: now(),
    id,
  }
  useDb().prepare(
    `UPDATE stores SET name = @name, status = @status, brand = @brand,
     theme = @theme, settings = @settings, updated_at = @updated_at WHERE id = @id`,
  ).run(merged)
  return getStore(id)
}

export function deleteStore(id: string): void {
  useDb().prepare('DELETE FROM stores WHERE id = ?').run(id)
}

export function touchStore(id: string): void {
  useDb().prepare('UPDATE stores SET updated_at = ? WHERE id = ?').run(now(), id)
}

/* ------------------------------------------------------------------ pages */

interface PageRow {
  id: string, store_id: string, path: string, title: string,
  sections: string, is_home: number, nav_label: string | null, nav_order: number
}

function mapPage(row: PageRow): PageRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    path: row.path,
    title: row.title,
    sections: json<Section[]>(row.sections, []),
    isHome: !!row.is_home,
    navLabel: row.nav_label,
    navOrder: row.nav_order,
  }
}

export function listPages(storeId: string): PageRecord[] {
  const rows = useDb().prepare(
    'SELECT * FROM pages WHERE store_id = ? ORDER BY is_home DESC, nav_order ASC, title ASC',
  ).all(storeId) as PageRow[]
  return rows.map(mapPage)
}

export function getPage(storeId: string, path: string): PageRecord | undefined {
  const row = useDb().prepare('SELECT * FROM pages WHERE store_id = ? AND path = ?').get(storeId, path) as PageRow | undefined
  return row ? mapPage(row) : undefined
}

export function upsertPage(page: {
  storeId: string, path: string, title: string, sections: Section[]
  isHome?: boolean, navLabel?: string | null, navOrder?: number
}): PageRecord {
  const existing = getPage(page.storeId, page.path)
  const row = {
    id: existing?.id ?? newId(),
    store_id: page.storeId,
    path: page.path,
    title: page.title,
    sections: JSON.stringify(page.sections),
    is_home: (page.isHome ?? existing?.isHome ?? page.path === '/') ? 1 : 0,
    nav_label: page.navLabel !== undefined ? page.navLabel : (existing?.navLabel ?? null),
    nav_order: page.navOrder ?? existing?.navOrder ?? 0,
  }

  const db = useDb()
  if (row.is_home) {
    // Only one page can be the home page.
    db.prepare('UPDATE pages SET is_home = 0 WHERE store_id = ? AND path != ?').run(page.storeId, page.path)
  }
  db.prepare(
    `INSERT INTO pages (id, store_id, path, title, sections, is_home, nav_label, nav_order)
     VALUES (@id, @store_id, @path, @title, @sections, @is_home, @nav_label, @nav_order)
     ON CONFLICT (store_id, path) DO UPDATE SET
       title = @title, sections = @sections, is_home = @is_home,
       nav_label = @nav_label, nav_order = @nav_order`,
  ).run(row)

  touchStore(page.storeId)
  return getPage(page.storeId, page.path)!
}

export function deletePage(storeId: string, path: string): void {
  useDb().prepare('DELETE FROM pages WHERE store_id = ? AND path = ? AND is_home = 0').run(storeId, path)
  touchStore(storeId)
}

/* --------------------------------------------------------------- products */

interface ProductRow {
  id: string, store_id: string, handle: string, title: string, description: string,
  price_cents: number, compare_at_cents: number | null, image: string | null,
  status: string, inventory: number, tags: string, collection: string | null, created_at: string
}

interface VariantRow {
  id: string, product_id: string, title: string,
  price_cents: number | null, sku: string | null, inventory: number, position: number
}

function mapProduct(row: ProductRow, variants: VariantRow[]): ProductRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    handle: row.handle,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents,
    image: row.image,
    status: row.status === 'draft' ? 'draft' : 'active',
    inventory: row.inventory,
    tags: json<string[]>(row.tags, []),
    collection: row.collection,
    createdAt: row.created_at,
    variants: variants.map(v => ({
      id: v.id,
      productId: v.product_id,
      title: v.title,
      priceCents: v.price_cents,
      sku: v.sku,
      inventory: v.inventory,
    } satisfies VariantRecord)),
  }
}

function variantsFor(productIds: string[]): Map<string, VariantRow[]> {
  const map = new Map<string, VariantRow[]>()
  if (!productIds.length) return map
  const placeholders = productIds.map(() => '?').join(',')
  const rows = useDb().prepare(
    `SELECT * FROM variants WHERE product_id IN (${placeholders}) ORDER BY position ASC`,
  ).all(...productIds) as VariantRow[]
  for (const row of rows) {
    const list = map.get(row.product_id) ?? []
    list.push(row)
    map.set(row.product_id, list)
  }
  return map
}

export function listProducts(storeId: string, opts: { activeOnly?: boolean } = {}): ProductRecord[] {
  const sql = opts.activeOnly
    ? 'SELECT * FROM products WHERE store_id = ? AND status = \'active\' ORDER BY created_at ASC'
    : 'SELECT * FROM products WHERE store_id = ? ORDER BY created_at ASC'
  const rows = useDb().prepare(sql).all(storeId) as ProductRow[]
  const variants = variantsFor(rows.map(r => r.id))
  return rows.map(r => mapProduct(r, variants.get(r.id) ?? []))
}

export function getProduct(storeId: string, handle: string): ProductRecord | undefined {
  const row = useDb().prepare('SELECT * FROM products WHERE store_id = ? AND handle = ?').get(storeId, handle) as ProductRow | undefined
  if (!row) return undefined
  return mapProduct(row, variantsFor([row.id]).get(row.id) ?? [])
}

export function getProductById(id: string): ProductRecord | undefined {
  const row = useDb().prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined
  if (!row) return undefined
  return mapProduct(row, variantsFor([row.id]).get(row.id) ?? [])
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

export function upsertProduct(storeId: string, input: ProductInput): ProductRecord {
  const db = useDb()
  const existing = getProduct(storeId, input.handle)
  const id = existing?.id ?? newId()

  const row: ProductRow = {
    id,
    store_id: storeId,
    handle: input.handle,
    title: input.title,
    description: input.description ?? existing?.description ?? '',
    price_cents: input.priceCents,
    compare_at_cents: input.compareAtCents ?? null,
    image: input.image ?? existing?.image ?? null,
    status: input.status ?? existing?.status ?? 'active',
    inventory: input.inventory ?? existing?.inventory ?? 100,
    tags: JSON.stringify(input.tags ?? existing?.tags ?? []),
    collection: input.collection ?? existing?.collection ?? null,
    created_at: existing?.createdAt ?? now(),
  }

  db.prepare(
    `INSERT INTO products (id, store_id, handle, title, description, price_cents, compare_at_cents,
       image, status, inventory, tags, collection, created_at)
     VALUES (@id, @store_id, @handle, @title, @description, @price_cents, @compare_at_cents,
       @image, @status, @inventory, @tags, @collection, @created_at)
     ON CONFLICT (store_id, handle) DO UPDATE SET
       title = @title, description = @description, price_cents = @price_cents,
       compare_at_cents = @compare_at_cents, image = @image, status = @status,
       inventory = @inventory, tags = @tags, collection = @collection`,
  ).run(row)

  if (input.variants) {
    db.prepare('DELETE FROM variants WHERE product_id = ?').run(id)
    const stmt = db.prepare(
      `INSERT INTO variants (id, product_id, title, price_cents, sku, inventory, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    input.variants.forEach((v, i) => {
      stmt.run(newId(), id, v.title, v.priceCents ?? null, v.sku ?? null, v.inventory ?? 50, i)
    })
  }

  touchStore(storeId)
  return getProduct(storeId, input.handle)!
}

export function deleteProduct(storeId: string, handle: string): boolean {
  const res = useDb().prepare('DELETE FROM products WHERE store_id = ? AND handle = ?').run(storeId, handle)
  touchStore(storeId)
  return res.changes > 0
}

export function decrementInventory(productId: string, variantId: string | null, qty: number): void {
  const db = useDb()
  if (variantId) {
    db.prepare('UPDATE variants SET inventory = MAX(0, inventory - ?) WHERE id = ?').run(qty, variantId)
  }
  db.prepare('UPDATE products SET inventory = MAX(0, inventory - ?) WHERE id = ?').run(qty, productId)
}

/* ------------------------------------------------------------------ carts */

interface CartRow { id: string, store_id: string, token: string, lines: string, created_at: string, updated_at: string }

export function getOrCreateCart(storeId: string, token: string | undefined): { token: string, lines: CartLine[] } {
  const db = useDb()
  if (token) {
    const row = db.prepare('SELECT * FROM carts WHERE token = ? AND store_id = ?').get(token, storeId) as CartRow | undefined
    if (row) return { token: row.token, lines: json<CartLine[]>(row.lines, []) }
  }
  const fresh = randomUUID().replace(/-/g, '')
  db.prepare(
    'INSERT INTO carts (id, store_id, token, lines, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(newId(), storeId, fresh, '[]', now(), now())
  return { token: fresh, lines: [] }
}

export function saveCart(storeId: string, token: string, lines: CartLine[]): void {
  useDb().prepare('UPDATE carts SET lines = ?, updated_at = ? WHERE token = ? AND store_id = ?')
    .run(JSON.stringify(lines), now(), token, storeId)
}

export function clearCart(storeId: string, token: string): void {
  saveCart(storeId, token, [])
}

/* ----------------------------------------------------------------- orders */

interface OrderRow {
  id: string, store_id: string, number: number, email: string, status: string,
  lines: string, totals: string, currency: string, shipping: string,
  payment_ref: string, created_at: string
}

function mapOrder(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    number: row.number,
    email: row.email,
    status: row.status as OrderRecord['status'],
    lines: json<OrderRecord['lines']>(row.lines, []),
    totals: json<OrderRecord['totals']>(row.totals, { subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0 }),
    currency: row.currency,
    shipping: json<OrderRecord['shipping']>(row.shipping, {
      name: '', address1: '', city: '', region: '', postal: '', country: '',
    }),
    paymentRef: row.payment_ref,
    createdAt: row.created_at,
  }
}

export function createOrder(order: Omit<OrderRecord, 'id' | 'number' | 'createdAt'>): OrderRecord {
  const db = useDb()
  const next = db.prepare('SELECT COALESCE(MAX(number), 1000) + 1 AS n FROM orders WHERE store_id = ?')
    .get(order.storeId) as { n: number }

  const row: OrderRow = {
    id: newId(),
    store_id: order.storeId,
    number: next.n,
    email: order.email,
    status: order.status,
    lines: JSON.stringify(order.lines),
    totals: JSON.stringify(order.totals),
    currency: order.currency,
    shipping: JSON.stringify(order.shipping),
    payment_ref: order.paymentRef,
    created_at: now(),
  }
  db.prepare(
    `INSERT INTO orders (id, store_id, number, email, status, lines, totals, currency, shipping, payment_ref, created_at)
     VALUES (@id, @store_id, @number, @email, @status, @lines, @totals, @currency, @shipping, @payment_ref, @created_at)`,
  ).run(row)
  return mapOrder(row)
}

export function listOrders(storeId: string): OrderRecord[] {
  const rows = useDb().prepare('SELECT * FROM orders WHERE store_id = ? ORDER BY number DESC').all(storeId) as OrderRow[]
  return rows.map(mapOrder)
}

export function getOrder(storeId: string, id: string): OrderRecord | undefined {
  const row = useDb().prepare('SELECT * FROM orders WHERE store_id = ? AND id = ?').get(storeId, id) as OrderRow | undefined
  return row ? mapOrder(row) : undefined
}

export function setOrderStatus(storeId: string, id: string, status: OrderRecord['status']): OrderRecord | undefined {
  useDb().prepare('UPDATE orders SET status = ? WHERE store_id = ? AND id = ?').run(status, storeId, id)
  return getOrder(storeId, id)
}

/* ------------------------------------------------------------------- chat */

interface ChatRow { id: string, store_id: string, role: string, content: string, actions: string, created_at: string }

export function appendChat(storeId: string, role: 'user' | 'assistant', content: string, actions: ChatMessageRecord['actions'] = []): ChatMessageRecord {
  const row: ChatRow = {
    id: newId(),
    store_id: storeId,
    role,
    content,
    actions: JSON.stringify(actions),
    created_at: now(),
  }
  useDb().prepare(
    'INSERT INTO chat_messages (id, store_id, role, content, actions, created_at) VALUES (@id, @store_id, @role, @content, @actions, @created_at)',
  ).run(row)
  return { id: row.id, storeId, role, content, actions, createdAt: row.created_at }
}

export function listChat(storeId: string, limit = 100): ChatMessageRecord[] {
  const rows = useDb().prepare(
    'SELECT * FROM chat_messages WHERE store_id = ? ORDER BY created_at ASC LIMIT ?',
  ).all(storeId, limit) as ChatRow[]
  return rows.map(r => ({
    id: r.id,
    storeId: r.store_id,
    role: r.role as 'user' | 'assistant',
    content: r.content,
    actions: json<ChatMessageRecord['actions']>(r.actions, []),
    createdAt: r.created_at,
  }))
}
