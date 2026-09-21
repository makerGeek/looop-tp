/**
 * Single source of truth for the database schema.
 *
 * Kept as a TS string (rather than a .sql file read at runtime) so it survives
 * bundling into .output — Nitro copies modules, not stray data files.
 */
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS stores (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'draft',
  brand      TEXT NOT NULL,
  theme      TEXT NOT NULL,
  settings   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);

CREATE TABLE IF NOT EXISTS pages (
  id        TEXT PRIMARY KEY,
  store_id  TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  path      TEXT NOT NULL,
  title     TEXT NOT NULL,
  sections  TEXT NOT NULL,
  is_home   INTEGER NOT NULL DEFAULT 0,
  nav_label TEXT,
  nav_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (store_id, path)
);

CREATE TABLE IF NOT EXISTS products (
  id               TEXT PRIMARY KEY,
  store_id         TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  handle           TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  price_cents      INTEGER NOT NULL,
  compare_at_cents INTEGER,
  image            TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  inventory        INTEGER NOT NULL DEFAULT 0,
  tags             TEXT NOT NULL DEFAULT '[]',
  collection       TEXT,
  created_at       TEXT NOT NULL,
  UNIQUE (store_id, handle)
);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);

CREATE TABLE IF NOT EXISTS variants (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  price_cents INTEGER,
  sku         TEXT,
  inventory   INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);

CREATE TABLE IF NOT EXISTS carts (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  lines      TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,
  store_id    TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  number      INTEGER NOT NULL,
  email       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'paid',
  lines       TEXT NOT NULL,
  totals      TEXT NOT NULL,
  currency    TEXT NOT NULL,
  shipping    TEXT NOT NULL,
  payment_ref TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  actions    TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_store ON chat_messages(store_id, created_at);
`
