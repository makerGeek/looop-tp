# StoreForge

An AI ecommerce store builder — Shopify's commerce engine with Lovable's build-by-conversation loop.

You describe the store you want. Claude builds it: brand, theme, pages, sections, and a real product
catalogue. The preview pane is the actual storefront, with a working cart and checkout, from the first
generation. Then you keep editing by talking to it.

```
"A cold-brew coffee roaster with a subscription and an about page"

  ✓ Styled "Northbound Coffee Roasters"     — palette, type, radius chosen for the niche
  ✓ Added 8 products                        — real merchandising copy, variants, prices
  ✓ Built the home page                     — hero · products · features · testimonials · cta
  ✓ Built /products
  ✓ Built /about
  ✓ Updated store settings                  — currency, shipping, free-shipping threshold
```

---

## Quick start

```bash
npm install
cp .env.example .env     # optional — see "Running without a key" below
npm run dev              # http://localhost:3000
```

Create an account, create a store, and describe it. To load a demo account and a fully built store
in one step, with the dev server already running:

```bash
npm run seed             # or: npm run seed "a plant shop for low-light apartments"
```

## Configuration

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables real AI generation. Without it, the local planner runs instead. |
| `ANTHROPIC_MODEL` | Defaults to `claude-opus-5`. |
| `DATABASE_PATH` | SQLite file location. Defaults to `.data/storeforge.db`. |
| `SESSION_SECRET` | Generate with `openssl rand -hex 32`. |

### Running without a key

StoreForge ships with a deterministic local planner so a fresh clone is fully demoable. It matches
your prompt to the closest of six niche kits (coffee, skincare, plants, apparel, homeware, fitness)
and builds a complete, genuinely differentiated store — real copy, real prices, a palette and type
pairing chosen for that niche — through the same tool executors the model uses.

It is not pretending to be the model. It handles building a store, recolouring it, and publishing;
for anything else it says plainly that a key is needed rather than silently doing nothing.

---

## How the builder works

The model does not write code. It calls tools that mutate a **validated store document**, and a
renderer turns that document into the storefront. A bad generation is therefore never a broken site —
the worst case is a store you ask it to change.

```
your message
   ↓
POST /api/stores/:id/build          streams NDJSON back to the browser
   ↓
Claude (tool-use loop, streaming)
   ↓
get_store_state · set_brand_and_theme · upsert_page · add_products
delete_product · delete_page · update_settings · publish_store
   ↓
SQLite  ──►  storefront renderer  ──►  live preview iframe
```

Each tool call appears in the chat the moment the server runs it, so you watch the store assemble
step by step rather than waiting for one large response.

**The tool surface** is deliberately small and closed. Sections come from a fixed vocabulary
(`hero`, `featured_products`, `rich_text`, `feature_grid`, `testimonials`, `gallery`, `faq`,
`cta_banner`, `newsletter`, `logo_cloud`), and every model-authored section is normalised before it
is stored: wrong-shaped items are repaired where possible and dropped where not.

**Safety rails in the loop:** tool rounds are capped at 12; a `max_tokens` stop is treated as a
failed turn rather than executing possibly-truncated tool inputs; `refusal` is surfaced as a clear
message. Failed turns are still written to the transcript, so the history reflects what happened.

### Product images

Every product and hero image is a generated SVG, derived deterministically from a seed string
(`server/utils/artwork.ts`). Nothing is fetched from a stock-photo host, so the builder works
offline and store contents never leave the server.

---

## What actually works

- **Auth** — email/password with scrypt hashing and httpOnly session cookies.
- **Multi-store** — one account, many stores, each with its own slug, catalogue and orders.
- **Storefront** — server-rendered, themed entirely by CSS variables the AI sets. Home, arbitrary
  pages, product detail with variants, cart, checkout, order confirmation.
- **Commerce** — variants, per-variant pricing and stock, flat and free-shipping rules, tax rate,
  inventory decrement on purchase. All money is integer cents; **every total is recomputed
  server-side from the catalogue**, so a tampered cart payload cannot change what is charged.
- **Admin** — product CRUD, order list with status transitions, store settings, publish/unpublish.
- **Draft/published** — a draft store is previewable by its owner and 404s for everyone else.

### Payments

Checkout runs a **simulated gateway** (`capturePayment` in `server/utils/commerce.ts`). No card
details are requested, transmitted or stored; the checkout form collects only contact and shipping
details, and orders are recorded exactly as real ones would be. Replace that one function with a
Stripe PaymentIntent confirmation to take real money.

Newsletter signups are acknowledged in the UI but not persisted — there is no email provider wired
up, and quietly collecting addresses nobody reads would be worse than saying so.

---

## Layout

```
app/                     Vue app
  components/storefront/ the renderer: Shell, SectionRenderer, ProductCard
  composables/           useAuth, useCart, useBuilder (NDJSON stream reader)
  pages/                 landing · auth · dashboard · builder · admin · /s/:slug storefront
  assets/css/            main.css (app shell) · storefront.css (themed renderer)
server/
  ai/                    agent.ts (tool loop) · tools.ts · prompt.ts · fallback.ts · niches.ts
  api/                   auth · stores (incl. the streaming build endpoint) · storefront
  db/                    schema.ts · index.ts · repo.ts
  utils/                 auth · commerce · artwork · storefront · slug
shared/                  types.ts · money.ts — imported by both sides via `#shared`
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` / `npm start` | Production build, then run it |
| `npm run typecheck` | `vue-tsc` across app, server and shared |
| `npm run seed` | Create a demo account and a built, published store |
| `npm run db:reset` | Delete the SQLite database |

---

## Notes for whoever picks this up

**The sibling-tsconfig shim.** StoreForge currently lives in a subdirectory of a repo that has its
own `tsconfig.json` extending `./.nuxt/tsconfig.json` — a path that only exists after that project
has been prepared. Vite's bundler walks up the tree, finds that file, fails to resolve what it
extends, and rejects every `<script lang="ts">` transform in this project. No tsconfig placed inside
StoreForge stops the lookup, so `scripts/ensure-sibling-tsconfig.mjs` runs before `dev`, `build` and
`typecheck` and writes a stub at the missing path. Move StoreForge to its own repository and both
the script and its `package.json` hooks can be deleted.

**Known limits.** SQLite means a single node; there is no email delivery, no real payment provider,
no image upload (artwork is generated), and no rate limiting on the build endpoint — a busy
deployment would want all five addressed before taking real traffic.
