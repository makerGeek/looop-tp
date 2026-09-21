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
docker compose up --build      # http://localhost:3000
```

Postgres comes up, migrations run, the app starts. Nothing else to install. For
real AI generation rather than the local template planner, pass a key:
`ANTHROPIC_API_KEY=sk-ant-… docker compose up --build`.

See [TESTING.md](./TESTING.md) for a guided tour of what to try.

### Without Docker

Needs Node 22 and a Postgres 16 database.

```bash
npm install
cp .env.example .env          # set NUXT_DATABASE_URL and NUXT_SESSION_SECRET
createdb storeforge
npm run db:migrate
npm run dev                   # http://localhost:3000
```

Create an account, create a store, and describe it. To load a demo account and a fully built store
in one step, with the dev server already running:

```bash
npm run seed                  # or: npm run seed "a plant shop for low-light apartments"
```

## Configuration

Every setting is read from a `NUXT_`-prefixed environment variable and validated at boot — a missing
secret fails immediately with a message naming it, rather than at the first request that needs it.
See `.env.example` for the full list; the ones that matter most:

| Variable | Purpose |
|---|---|
| `NUXT_DATABASE_URL` | Postgres connection string. Required. |
| `NUXT_SESSION_SECRET` | Signs session cookies. At least 32 characters. Required. |
| `NUXT_ANTHROPIC_API_KEY` | Enables real AI generation. Without it, the local planner runs instead. |
| `NUXT_STRIPE_SECRET_KEY` | Subscription billing. Without it, every org stays on the free plan. |
| `NUXT_RESEND_API_KEY` | Transactional email. Without it, invites and verification are logged, not sent. |

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
- **Organizations** — users belong to organizations through memberships with `owner`, `admin` and
  `member` roles. Every store belongs to an organization, so authorization is always "is this user a
  member of the store's org". A personal workspace is created on signup, so no code path has to
  handle an account without one.
- **Plans, billing and quota** — Free / Pro / Business, sold through Stripe Checkout and managed in
  the Customer Portal. Store counts and AI builds are capped per plan and enforced server-side; the
  quota is claimed *before* the model runs, in a single statement, so concurrent requests cannot both
  slip past the last remaining build. Token usage is recorded per organization per month.
- **Webhook-driven entitlement** — the Stripe webhook, not the success redirect, grants and revokes
  plans: a user can close the tab, and a card can fail months later. Signatures are verified against
  the raw body and every event id is recorded, so redelivery is a no-op. A failed payment marks the
  subscription `past_due` without immediately pulling the plan.
- **Multi-store** — one account, many stores, each with its own slug, catalogue and orders.
- **Storefront** — server-rendered, themed entirely by CSS variables the AI sets. Home, arbitrary
  pages, product detail with variants, cart, checkout, order confirmation.
- **Commerce** — variants, per-variant pricing and stock, flat and free-shipping rules, tax rate,
  inventory decrement on purchase. All money is integer cents; **every total is recomputed
  server-side from the catalogue**, so a tampered cart payload cannot change what is charged. Order
  numbers are sequential per store and survive concurrent checkouts.
- **Team** — invite by email with a role, accept via a single-use link, change roles, remove people
  or leave. An organization can never lose its last owner. When email isn't configured the invite
  link is returned to the UI so it can still be delivered by hand.
- **Accounts** — email verification and password reset, both on hashed single-use tokens. A reset
  invalidates every existing session, since that is how a compromised account is recovered.
- **Admin** — product CRUD, order list with status transitions, store settings, publish/unpublish.
- **Draft/published** — a draft store is previewable by its owner and 404s for everyone else.

### Two separate money paths — don't conflate them

**Merchants paying StoreForge** is real: Stripe Billing, subscriptions, webhooks, entitlements.

**Shoppers paying merchants** is *not*. Storefront checkout runs a **simulated gateway**
(`capturePayment` in `server/utils/commerce.ts`). No card details are requested, transmitted or
stored; the form collects only contact and shipping details, and orders are recorded exactly as real
ones would be. Taking real money for merchants needs Stripe Connect — a separate project, because it
brings onboarding, KYC and payouts with it.

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
  api/                   auth · stores (incl. the streaming build endpoint) · storefront · health
  billing/               plans.ts (entitlements) · usage.ts (quota + metering) · stripe.ts · subscription.ts
  email/                 send.ts (Resend, with a logging fallback)
  db/                    schema.ts (Drizzle) · index.ts · repo.ts · migrations/
  utils/                 auth · store-guard · commerce · artwork · storefront · slug
  config.ts              validated environment
shared/                  types.ts · money.ts — imported by both sides via `#shared`
test/                    integration suites against a real server, plus unit tests
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` / `npm start` | Production build, then run it |
| `npm run typecheck` | `vue-tsc` across app, server and shared |
| `npm test` | Integration + unit suites (needs a build and a Postgres database first) |
| `npm run db:generate` | Write a migration from the current schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:reset` | Drop the schema so migrations rebuild it |
| `npm run seed` | Create a demo account and a built, published store |

### Testing

Integration tests run against the **production bundle over HTTP** rather than a mocked app —
routing, cookies, streaming and the Postgres driver are the parts most likely to break, and only a
real server exercises them. So `npm run build` has to come first (CI does this automatically).

45 tests covering: signup and login failure modes; tenant isolation (another org gets 404 on every
store route); role boundaries (a member cannot delete a store or invite, an admin cannot touch
billing, the last owner cannot be demoted or removed); invitations, including one addressed to
someone else being refused; draft-store visibility; catalogue-authoritative pricing against a
tampered cart payload; shipping thresholds; checkout validation; inventory decrement; concurrent
order numbering; AI build quota enforcement; and the Stripe webhook — signature verification against
real HMAC signatures, replay protection, plan grant and revoke, and a failed payment not cutting
access off.

---

## Notes for whoever picks this up

**Operational posture.** Rate limits on the credential endpoints are Postgres-backed fixed windows,
because more than one instance runs and a per-process counter would multiply the real limit by the
instance count. The client IP is taken from platform headers where present, and otherwise from the
*rightmost* `x-forwarded-for` hop — the leftmost is attacker-controlled, and using it would let
anyone bypass every limit with a fresh fake address per request.

**No Content-Security-Policy yet.** Storefront themes set colours through inline `style` attributes
and Nuxt's hydration payload is an inline script, so a policy strict enough to be worth having would
break every generated store. The injection surface is small by construction — AI-authored content
renders through Vue interpolation, never `v-html` — and a test asserts that a `<script>` tag pushed
through a product title comes back escaped. A nonce-based policy is the right fix and should land
before custom domains do.

**Known limits.** No image upload (artwork is generated), no background job runner, and storefronts
are served from `/s/:slug` rather than their own domains. The Dockerfile and `fly.toml` are
configured but have only been verified in CI, not against a live Fly account.
