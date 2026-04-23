# React 2026 Ecosystem Course

A Codecademy-inspired, internal learning platform covering the modern React
ecosystem: **React 19, Next.js 15, TanStack, Zustand, Tailwind v4, shadcn/ui,
Vitest, Cypress, Biome, tRPC/Drizzle, RSC, Server Actions, Compiler**.

30 interactive exercises from beginner to expert + auxiliary tiers, running in
an in-browser Sandpack editor pinned to React 19.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript strict**
- **Tailwind CSS v4** (CSS-first `@theme`) + hand-rolled shadcn-style UI primitives
- **Sandpack** (`@codesandbox/sandpack-react`) with React 19 custom template for
  live exercises; Shiki-like readonly viewer for RSC / Server Actions / full-stack
- **MDX** lesson content, frontmatter validated by **Zod**
- **Zustand** + `persist` (localStorage) for XP / streak / completion
- **Vitest** + **@testing-library/react** for unit tests
- **Cypress 13** + `cypress-axe` + `cypress-mochawesome-reporter` +
  `@cypress/code-coverage` for E2E + coverage
- **Biome** for lint + format

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm install` | install dependencies (Node 22 + pnpm 10) |
| `pnpm dev` | start dev server at `http://localhost:3000` |
| `pnpm build` | static export → `out/`, mirrored to `dist/` for Cloudflare Pages |
| `pnpm start` | run the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | Biome check |
| `pnpm test:unit` | Vitest unit tests |
| `pnpm e2e` | boot instrumented dev server and run Cypress headless |
| `pnpm e2e:open` | same but with Cypress UI |

## Running the full test suite

```bash
pnpm install
pnpm typecheck
pnpm test:unit    # 67 unit tests
pnpm e2e          # boots dev server, runs 65 Cypress tests, produces artifacts
```

**Artifacts produced by `pnpm e2e`:**

- `cypress/videos/*.mp4` — one recording per spec
- `cypress/reports/index.html` — mochawesome HTML report
- `cypress/reports/.jsons/*.json` — mochawesome JSON
- `coverage/index.html` — Istanbul coverage report

## How instrumentation works

E2E coverage requires client code to be instrumented with Istanbul so the
browser records hits into `window.__coverage__`. Because Next 15 uses SWC by
default (which doesn't natively run Babel plugins), `next.config.mjs` adds a
`babel-loader` webpack post-rule that runs `babel-plugin-istanbul` **only** when
`NODE_ENV=test` and **only** for files under `src/` (not node_modules, not
`src/sandpack/starters`, not `src/content`). SWC still handles the primary
transform; istanbul just adds counters.

Production builds use SWC exclusively — no babel config is written to disk,
ever. `scripts/e2e.mjs` is a thin wrapper around `start-server-and-test`.

## Curriculum

| Tier | Count | XP each | Topics |
| --- | --- | --- | --- |
| Beginner | 10 | 50 | JSX, props, `useState`, events, lists, narrowing, `useEffect`, `useRef`, Tailwind, shadcn composition |
| Intermediate | 8 | 100 | `useReducer`, custom hooks, context + `use()`, React Hook Form + Zod, TanStack Query, TanStack Router, Zustand slices, App Router |
| Advanced | 6 | 175 | RSC, `useOptimistic`, `useActionState` + server actions, Suspense + `use(promise)`, route handlers, parallel/intercepting routes |
| Expert | 3 | 300 | React Compiler, testing trifecta, full-stack tRPC + Drizzle |
| Auxiliary | 3 | 125 | A11y combobox, Biome + TS strict + CI, design tokens + theming |

RSC / Server Actions / Compiler / full-stack exercises use a read-only code
viewer because the Sandpack iframe can't run Node. All live-runtime exercises
execute entirely in-browser against a pinned React 19 runtime.

## Deployment (Cloudflare Pages)

Cloudflare Pages is configured (via its dashboard GitHub integration) to run
`npm run build` and serve from `dist/`. Our `build` script runs Next's static
export (which lands in `out/`) and then mirrors the directory to `dist/`, so
the CF preset keeps working unchanged and every PR gets a preview URL from CF.

In parallel, `.github/workflows/ci.yml` runs typecheck + unit tests + build on
every push/PR as a fast gate (and uploads the built `dist/` as an artifact for
debugging). The CF deploy itself still happens via CF's GitHub integration, not
the action — the action is belt-and-suspenders.

## Non-goals

Internal tool — no auth, tenancy, security hardening, scalability work,
analytics, i18n. Targets desktop Chrome at 1024px+.
