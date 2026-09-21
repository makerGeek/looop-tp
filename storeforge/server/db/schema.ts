import {
  boolean, index, integer, jsonb, pgTable, primaryKey,
  text, timestamp, uniqueIndex, varchar,
} from 'drizzle-orm/pg-core'
import type {
  Brand, CartLine, CartTotals, OrderRecord, Section, StoreSettings, Theme,
} from '#shared/types'

/**
 * Database schema.
 *
 * Tenancy runs users → memberships → organizations → stores. Everything a
 * merchant owns hangs off a store, and every store hangs off an organization,
 * so authorization is always "is this user a member of the store's org".
 *
 * JSON columns are typed with `$type<>()` so the store document (theme,
 * sections, cart lines) keeps its shape end to end without a parse layer.
 */

/* ------------------------------------------------------------------ users */

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('idx_sessions_user').on(table.userId)])

/**
 * Single-use tokens for email verification and password reset.
 * Only the hash is stored, so a database leak cannot be replayed as a token.
 */
export const authTokens = pgTable('auth_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: varchar('purpose', { length: 32 }).notNull().$type<'verify_email' | 'reset_password'>(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('idx_auth_tokens_user').on(table.userId)])

/* ---------------------------------------------------------- organizations */

export type Role = 'owner' | 'admin' | 'member'

export const organizations = pgTable('organizations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const memberships = pgTable('memberships', {
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  orgId: varchar('org_id', { length: 36 }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull().$type<Role>().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.userId, table.orgId] }),
  index('idx_memberships_org').on(table.orgId),
])

export const invitations = pgTable('invitations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  orgId: varchar('org_id', { length: 36 }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 16 }).notNull().$type<Role>().default('member'),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  invitedBy: varchar('invited_by', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('idx_invitations_org').on(table.orgId),
  uniqueIndex('idx_invitations_pending').on(table.orgId, table.email),
])

/* ----------------------------------------------------------------- stores */

export const stores = pgTable('stores', {
  id: varchar('id', { length: 36 }).primaryKey(),
  orgId: varchar('org_id', { length: 36 }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  status: varchar('status', { length: 16 }).notNull().$type<'draft' | 'published'>().default('draft'),
  brand: jsonb('brand').notNull().$type<Brand>(),
  theme: jsonb('theme').notNull().$type<Theme>(),
  settings: jsonb('settings').notNull().$type<StoreSettings>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('idx_stores_org').on(table.orgId)])

export const pages = pgTable('pages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  storeId: varchar('store_id', { length: 36 }).notNull().references(() => stores.id, { onDelete: 'cascade' }),
  path: varchar('path', { length: 120 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  sections: jsonb('sections').notNull().$type<Section[]>().default([]),
  isHome: boolean('is_home').notNull().default(false),
  navLabel: varchar('nav_label', { length: 60 }),
  navOrder: integer('nav_order').notNull().default(0),
}, table => [uniqueIndex('idx_pages_store_path').on(table.storeId, table.path)])

export const products = pgTable('products', {
  id: varchar('id', { length: 36 }).primaryKey(),
  storeId: varchar('store_id', { length: 36 }).notNull().references(() => stores.id, { onDelete: 'cascade' }),
  handle: varchar('handle', { length: 120 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull().default(''),
  priceCents: integer('price_cents').notNull(),
  compareAtCents: integer('compare_at_cents'),
  image: text('image'),
  status: varchar('status', { length: 16 }).notNull().$type<'active' | 'draft'>().default('active'),
  inventory: integer('inventory').notNull().default(0),
  tags: jsonb('tags').notNull().$type<string[]>().default([]),
  collection: varchar('collection', { length: 120 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex('idx_products_store_handle').on(table.storeId, table.handle)])

export const variants = pgTable('variants', {
  id: varchar('id', { length: 36 }).primaryKey(),
  productId: varchar('product_id', { length: 36 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 120 }).notNull(),
  priceCents: integer('price_cents'),
  sku: varchar('sku', { length: 80 }),
  inventory: integer('inventory').notNull().default(0),
  position: integer('position').notNull().default(0),
}, table => [index('idx_variants_product').on(table.productId)])

/* --------------------------------------------------------------- commerce */

export const carts = pgTable('carts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  storeId: varchar('store_id', { length: 36 }).notNull().references(() => stores.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 64 }).notNull().unique(),
  lines: jsonb('lines').notNull().$type<CartLine[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orders = pgTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  storeId: varchar('store_id', { length: 36 }).notNull().references(() => stores.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().$type<OrderRecord['status']>().default('paid'),
  lines: jsonb('lines').notNull().$type<CartLine[]>(),
  totals: jsonb('totals').notNull().$type<CartTotals>(),
  currency: varchar('currency', { length: 3 }).notNull(),
  shipping: jsonb('shipping').notNull().$type<OrderRecord['shipping']>(),
  paymentRef: varchar('payment_ref', { length: 80 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('idx_orders_store').on(table.storeId),
  uniqueIndex('idx_orders_store_number').on(table.storeId, table.number),
])

export const chatMessages = pgTable('chat_messages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  storeId: varchar('store_id', { length: 36 }).notNull().references(() => stores.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull().$type<'user' | 'assistant'>(),
  content: text('content').notNull(),
  actions: jsonb('actions').notNull().$type<Array<{ tool: string, summary: string, detail?: string }>>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('idx_chat_store_created').on(table.storeId, table.createdAt)])

/* -------------------------------------------------- billing and metering */

export type PlanId = 'free' | 'pro' | 'business'

export const subscriptions = pgTable('subscriptions', {
  orgId: varchar('org_id', { length: 36 }).primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 16 }).notNull().$type<PlanId>().default('free'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 80 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 80 }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('idx_subscriptions_customer').on(table.stripeCustomerId)])

/**
 * One row per organization per billing month.
 *
 * `periodStart` is the first day of the UTC month, which keeps the primary key
 * derivable without reading the subscription — a build can meter itself even if
 * Stripe is unreachable.
 */
export const usageCounters = pgTable('usage_counters', {
  orgId: varchar('org_id', { length: 36 }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  periodStart: varchar('period_start', { length: 7 }).notNull(), // YYYY-MM
  aiBuilds: integer('ai_builds').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.orgId, table.periodStart] })])

/**
 * Stripe redelivers webhooks. Recording each event id and checking it before
 * applying makes replays a no-op instead of a double upgrade.
 */
export const webhookEvents = pgTable('webhook_events', {
  id: varchar('id', { length: 80 }).primaryKey(),
  type: varchar('type', { length: 80 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})
