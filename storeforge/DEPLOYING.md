# Deploying StoreForge

## Why a persistent process, not serverless

An AI build streams for as long as the model takes — often minutes. Serverless
function timeouts cut that off mid-build, leaving a half-written store and a
charged quota. StoreForge therefore runs as a long-lived Node process. Fly.io is
configured here; Railway, Render or a plain container host work the same way.

## First deploy

```bash
fly launch --no-deploy            # creates the app; keep the bundled fly.toml
fly postgres create --name storeforge-db
fly postgres attach storeforge-db # sets DATABASE_URL
```

StoreForge reads `NUXT_`-prefixed variables, so point its own at the attached one
and set the rest as secrets:

```bash
fly secrets set \
  NUXT_DATABASE_URL="$(fly ssh console -C 'printenv DATABASE_URL')" \
  NUXT_SESSION_SECRET="$(openssl rand -hex 32)" \
  NUXT_PUBLIC_APP_URL="https://storeforge.fly.dev" \
  NUXT_ANTHROPIC_API_KEY="sk-ant-…" \
  NUXT_RESEND_API_KEY="re_…" \
  NUXT_STRIPE_SECRET_KEY="sk_live_…" \
  NUXT_STRIPE_WEBHOOK_SECRET="whsec_…" \
  NUXT_STRIPE_PRICE_PRO_MONTHLY="price_…" \
  NUXT_STRIPE_PRICE_BUSINESS_MONTHLY="price_…"

fly deploy
```

Migrations run as the release command, once per deploy, before any new instance
takes traffic. Running them at boot instead would race every other instance
during a rolling deploy.

## Stripe webhook

Point a webhook at `https://<your-host>/api/webhooks/stripe` subscribing to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Then set `NUXT_STRIPE_WEBHOOK_SECRET` to the signing secret Stripe shows. Until
it is set the endpoint returns 503 rather than trusting unverified payloads.

Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## What runs without which keys

Nothing here is required to boot, and each absence degrades in a defined way
rather than erroring:

| Missing | Effect |
|---|---|
| `NUXT_ANTHROPIC_API_KEY` | The local planner builds stores from niche templates. |
| `NUXT_STRIPE_SECRET_KEY` | Every org stays on the free plan; the pricing page compares plans without offering checkout. |
| `NUXT_RESEND_API_KEY` | Invite, verification and reset emails are logged with their links instead of sent, and the invite API returns the link to the UI. |
| `NUXT_SENTRY_DSN` | No error reporting. |

`NUXT_DATABASE_URL` and `NUXT_SESSION_SECRET` are the only hard requirements;
without them the process exits at boot naming what is missing.

## Health

`/api/health` runs a query against Postgres rather than only proving the process
is alive, and returns 503 when the database is unreachable. It is what both the
Fly check and the container `HEALTHCHECK` poll.

## Operational notes

- **Connection pool.** `DATABASE_POOL_MAX` defaults to 10 per instance. Multiply
  by instance count and keep it under the database's cap.
- **Rate-limit table.** `rate_limits` accumulates one row per key per window.
  `pruneRateLimits()` clears windows older than a day; call it from a scheduled
  job if the table grows.
- **Scaling.** Everything is stateless apart from Postgres, so `fly scale count`
  is safe. Sessions, carts and rate limits are all in the database.
