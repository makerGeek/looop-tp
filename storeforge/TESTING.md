# Testing StoreForge

## The fastest way: Docker

```bash
docker compose up --build
```

That's it — Postgres comes up, migrations run, and the app is on
<http://localhost:3000>. Nothing else to install.

To get real AI generation rather than the local template planner:

```bash
ANTHROPIC_API_KEY=sk-ant-… docker compose up --build
```

## Without Docker

Needs Node 22 and a Postgres 16 you can reach.

```bash
npm install
createdb storeforge

export NUXT_DATABASE_URL=postgres://localhost:5432/storeforge
export NUXT_SESSION_SECRET=$(openssl rand -hex 32)

npm run db:migrate
npm run dev
```

## Load a demo store in one step

With the app already running, in another terminal:

```bash
npm run seed
# or pick the niche:
npm run seed "a plant shop for low-light apartments"
```

That creates `demo@storeforge.test` / `forge-demo-2024` with a built,
published store.

---

## A ten-minute tour

**1. Build a store.** Sign up, create a store, and describe it — *"a small-batch
coffee roaster with single origin beans and a subscription"*. Watch the tool
calls land one at a time in the chat while the preview fills in. Theme, home
page, catalogue, about page and 8 products, all in one turn.

**2. Buy something.** Click **Publish**, open the storefront, add a couple of
items and check out. The gateway is simulated — no card details are asked for —
but the order is recorded exactly as a real one would be.

**3. See it as the merchant.** Open **Admin**: the order is there with the right
total, inventory has gone down, and you can move it through
paid → fulfilled → refunded.

**4. Try to cheat it.** The interesting one. Prices are recomputed server-side
from the catalogue, so a tampered cart is ignored:

```bash
# The catalogue price is $21.00. Ask to pay a penny:
curl -s -c /tmp/c -X POST localhost:3000/api/storefront/demo-store/cart \
  -H 'content-type: application/json' \
  -d '{"action":"add","handle":"yirgacheffe-washed","quantity":2,"unitPriceCents":1}' \
  | python3 -m json.tool | grep -E 'unitPriceCents|subtotal'
```

You get `2100` and a subtotal of `4200`.

**5. Hit the quota.** The free plan allows 20 AI builds a month. Check
**Plan** for the meter; the 21st build returns a 402 pointing at an upgrade
rather than silently spending tokens.

**6. Invite a teammate.** **Team → invite**. With no email provider configured
the invite link is handed back in the UI, so you can open it in a private
window and accept as the other person. Then confirm a `member` cannot delete a
store and an `admin` cannot reach billing.

**7. Check tenancy.** Sign up a second, unrelated account and try to open the
first account's store by id. Every route answers 404 — it never even confirms
the store exists.

## Running the tests instead

```bash
npm run build     # the integration suite runs against the real bundle
npm test
```

51 tests: tenancy, roles, invitations, pricing integrity, checkout, concurrent
order numbering, quota enforcement, and Stripe webhook signature verification
and replay protection.
