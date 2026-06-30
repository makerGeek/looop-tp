# Decisions — ai-powered-async-daily-sync

<!-- Each entry: ### YYYY-MM-DD — <role> — <one-line summary>
     Followed by 1–3 sentences of detail. Append only. -->

### 2026-06-30 — Developer — Reused `set_updated_at()` from 0001_init.sql rather than redeclaring
The trigger function already exists workspace-wide; redeclaring it would shadow with `create or replace` and risk drift. The new `async_standup_touch` trigger calls the existing function directly.

### 2026-06-30 — Developer — Split self-write policy on `async_standup` into three (insert/update/delete) instead of one `for all`
Architect's sketch already split them, and it matches the precision needed: insert needs membership + self, update needs both with-check sides, delete only needs self. A single `for all` would have made the membership check on delete redundant and the policy intent less readable.

### 2026-06-30 — Developer — Added `drop policy if exists` guards before each `create policy` on the new tables
Mirrors the 0001 convention so the migration is idempotent if re-applied during dev. Cheap insurance; no behaviour change on a fresh DB.

### 2026-06-30 — Developer — `todayLocalDate()` assembles YYYY-MM-DD from `Intl.DateTimeFormat.formatToParts` instead of relying on `en-CA` string formatting
`en-CA` happens to produce YYYY-MM-DD today, but the spec doesn't guarantee a stable separator across runtimes. Pulling parts out and joining with `-` ourselves removes that dependency while still using the user's local timezone via `Intl`.

### 2026-06-30 — Developer — `listMyHistory` takes `(workspaceId, userId)` and is workspace-scoped, no `limit` arg
The architect's earlier API sketch had `listMyHistory(userId, limit = 30)`, but the B-A4 contract finalised the signature as workspace-scoped without a limit. Followed the contract — pagination can layer on later if a single user racks up enough entries to matter.

### 2026-06-30 — Developer — Edge Function uses `claude-haiku-4-5` (current Haiku ID, per claude-api skill)
The vision doc and architect spec just said "Claude Haiku"; the current model id at this writing is `claude-haiku-4-5` (200K context, $1/$5 per MTok), confirmed via the claude-api skill. No date-suffixed variant — use the bare alias.

### 2026-06-30 — Developer — Attribution via `auth.admin.listUsers()` once per request, fall back to first 8 chars of user_id
The BA's "names submitters per bullet" needs *some* identifier per entry. The `auth.users` table has no public `name` column, so the function calls `supabase.auth.admin.listUsers()` once (service-role only) and maps `user_metadata.name` → email-local-part → `user_id.slice(0,8)`. listUsers is paginated and capped at 25 pages × 200 = 5000 users to bound worst-case latency, and soft-fails to id-based attribution if it errors. At v1 scale (workspaces of dozens, not thousands) this is cheap; we can swap for a `profile` table later without changing the contract.

### 2026-06-30 — Developer — In-memory rate-limit is per-isolate, not global
The 30 s per-workspace bucket lives in a module-level `Map`. Edge Functions can spin up multiple isolates, so a cold-start collision can double-charge once. Accepted at v1 per the architect's risk doc — the daily_digest upsert key keeps the table clean, and the empty-state short-circuit handles the zero-cost case. A Redis-backed limiter is the obvious next step if abuse appears.

### 2026-06-30 — Developer — Rate-limit window stamped *before* the Anthropic call, not after
If Anthropic fails (503), we still want the next retry paced by the same 30 s window — otherwise a client could retry-spam during an outage and rack up cost as soon as the upstream recovers. The downside is a successful caller blocks themselves for 30 s even on Anthropic failure; that's the correct tradeoff for a cost guardrail.

### 2026-06-30 — Developer — Function returns 503 (not 500) on Anthropic failure, leaves prior digest untouched
Matches AC 6.2 ("the previous digest remains until the new one replaces it") and the architect's error table. The upsert only runs after a successful AI response, so a Haiku outage cannot clobber a previously-good digest row.

### 2026-06-30 — Developer — EntryForm pre-fills existing entry but stays editable in this slice
B-D3's contract is the editable form; B-D4 owns the submitted/read-only swap. Pre-filling existing values on mount satisfies AC 2.1 from the form side and keeps the next slice purely additive — B-D4 can wrap this component with a state branch (or render `<Markdown>` next to it) without rewriting the inputs. Means a returning user today sees their words ready to edit and "Update" instead of "Submit" on the button.

### 2026-06-30 — Developer — Cmd/Ctrl+Enter handler lives on each textarea, not on a form-level listener
Three textareas, one handler reference shared between them; the per-element approach avoids a global `keydown` listener and naturally scopes the shortcut to "while typing inside the form". It also dodges React 19's stricter passive-listener defaults for synthetic form submits.

### 2026-06-30 — Developer — EntryForm derives "Saved at" from `existingEntry.updated_at`, not a separate `savedAt` state
The previous slice tracked a `savedAt` string only after a save in the current session, which meant the timestamp was blank on first load even when an entry existed. Now that B-D4 owns the submitted/read-only view, the timestamp lives wherever the persisted entry does — so the stamp shows on first paint and updates naturally after any in-place edit. Drops one piece of state and one cross-effect coupling.

### 2026-06-30 — Developer — `yesterdayLocalDate` parses the date string as UTC midnight, then decrements via `setUTCDate`
The brief's snippet used the same pattern and called out *why*: subtracting 86_400_000 ms from a host-TZ-parsed date would silently cross the wrong boundary near DST. Sticking with UTC arithmetic keeps the date subtraction purely calendar-level. The corresponding `toLocaleDateString` call also passes `timeZone: "UTC"` so the human-readable header doesn't pull the day back into the previous one for users west of UTC.

### 2026-06-30 — Developer — `YesterdayEntry` renders nothing (not an empty placeholder) when there's no prior entry
The brief was explicit ("If null, renders nothing"), but worth recording: a placeholder card would visually nag new users who joined yesterday with no entry, which contradicts the BA's reminders-non-goal. The component also soft-fails on query error rather than surfacing a banner — this surface is secondary and a fetch hiccup shouldn't draw the eye away from today's form.

### 2026-06-30 — Developer — `DigestCard` collapses empty + initial-loaded-but-no-digest into one "empty" branch
The brief's state list separated *loading-initial* (skeleton) and *empty* (no digest, no entries), but in practice the client can't cheaply distinguish "no entries today" from "entries exist but no one regenerated yet" without an extra `listTodayEntries` round-trip. The Edge Function already short-circuits with `{ empty: true, reason: 'no_entries' }` and never writes a digest row in that case, so a missing `daily_digest` row after the initial fetch is the right signal for the empty card. If a teammate submits later, the user re-opens the page or hits Regenerate from the entry-form side and the card fills in.

### 2026-06-30 — Developer — Stale-hint compares only to the current user's own entry, not to all teammates' entries
The brief is explicit ("the user's own entry's `updated_at` is more recent than the digest's `generated_at`"). A more general check would surface the hint whenever *any* teammate posted after the digest was generated, but (a) we don't have a cheap subscription to teammates' updates from this card alone, and (b) the user-facing copy ("Your latest entry isn't in the digest yet") only makes sense for the viewer's own entry. A "team has new entries" banner is a separate, future surface.

### 2026-06-30 — Developer — CoverageStrip lives above the two-column grid, not inside the digest card
Designer's spec placed coverage under the digest prose, but the build brief asked for a top-of-page strip and decoupling has two upsides: it stays visible while reading the digest (no scroll churn), and the digest card stays solely about the AI artifact. The submission count subline on the digest card (e.g. "4 of 6 submitted") already carries the same info inline, so we're not duplicating UX state — just splitting "who" (strip) from "what" (digest body).

### 2026-06-30 — Developer — CoverageStrip uses a `refreshKey: number` prop bumped by DailySync after EntryForm submits
Considered an `onRefresh` callback or shared context, but the simplest design that satisfies AC 5.2 ("updates without a full page reload") is a numeric key that flips in the parent and re-runs the strip's `useEffect`. EntryForm already exposes an `onSubmitted(entry)` callback from B-D3, so DailySync just bumps the key in that handler. No new dep, no global state.

### 2026-06-30 — Developer — EntryHistory uses a `useState` disclosure + custom toggle, not native `<details>`
A `<details>` element would handle open/close on its own, but it would also fire the open *every* time the user expanded — including after they collapsed and re-expanded — making it harder to enforce the "lazy-fetch once, cache for the session" rule. The state-machine variant (`idle | loading | loaded | error`) plus a controlled `open` flag makes the cache behaviour obvious: we only call `listMyHistory` when state is `idle` and the disclosure opens. Also gives us a clean place to hang the retry handler on the error branch.

### 2026-06-30 — Developer — EntryHistory filters today + yesterday client-side rather than altering `listMyHistory`
The build brief offered either approach. `listMyHistory`'s signature is shared (CoverageStrip-adjacent code could grow to use it later), and the dataset is tiny per user — filtering two dates client-side is essentially free and keeps the query layer dumb. If history grows enough to matter, the right fix is server-side pagination on `listMyHistory`, not a date-cutoff parameter.

### 2026-06-30 — Developer — Cmd-K "Submit today's standup" focuses the Yesterday textarea but does NOT switch a submitted entry back into edit mode
The brief was explicit: be humble about intent. If the user already submitted today, opening Cmd-K → "Submit today's standup" still navigates to `/sync` and the focus signal is delivered, but the read-only view stays read-only — the Yesterday textarea isn't mounted, so the focus effect is a silent no-op. The user can tap Edit themselves. Auto-flipping would override a deliberate read-only state and risk clobbering a saved entry with stale ref values.

### 2026-06-30 — Developer — Focus signal lives in `location.state.focusEntry`, cleared via `navigate(pathname, { replace: true, state: {} })` after consumption
Picked location.state over a query param (`?focus=entry`) for two reasons: it doesn't leave a stray URL in the bar, and it's naturally one-shot (no need to imperatively strip the param). The clear step is necessary too — without it, a browser refresh would refocus and steal the cursor from wherever the user moved it. Using `replace: true` keeps the back button sane.

### 2026-06-30 — Developer — Pass ref as a regular prop to the inner `Field` component instead of `React.forwardRef`
React 19 supports `ref` as an ordinary prop on function components, and `Field` is a tiny private helper inside `EntryForm` — wrapping it in `forwardRef` would add ceremony for no callsite benefit. The prop is typed as optional `React.Ref<HTMLTextAreaElement>` so non-Yesterday Fields don't need to thread anything.

### 2026-06-30 — Developer — Coverage avatar initials derived from `user_id.slice(0, 8)` for non-self members; email for the signed-in user
We don't yet have a `profile` table, and `auth.users.email` is only readable for the calling user (RLS). The build brief explicitly accepts user_id-based initials as the v1 fallback. The signed-in user gets the nicer email-based label so they can spot themselves in the strip without confusion; everyone else gets a stable two-char initial derived from their id. When a profile table lands, the row builder is the only place to change.

### 2026-06-30 — Developer — Sidebar dot uses Approach A (generic `indicator` prop on link spec), not a wrapping component
AppLayout already iterates a `links[]` array; threading an optional `indicator?: boolean` (plus `indicatorSrLabel?` for a11y) through the spec keeps the rendering loop generic — if Projects or Inbox later want a dot, the wiring is a one-line addition. Tried a `<DailySyncNavBadge />` sibling, but it required hard-coding the daily sync link in JSX and broke the symmetry of the existing array loop.

### 2026-06-30 — Developer — Dot indicator refreshes on window focus only — submit→hide on next page load is acceptable for v1
The hook fetches once on mount and on window focus. After the user submits today's standup the sidebar still shows the dot until the next navigation or focus event — by which point a refetch runs and the dot disappears. A reactive subscription (Supabase realtime on `async_standup` for this user) would be the right v2 move, but at v1 scale the brief explicitly accepts the staleness ("Easiest: fetch once on mount, expose a `refresh()` function"). The hook does export `refresh()` so DailySync could call it on submit, but that requires DailySync to either consume the hook itself or get a callback prop — deferred to avoid adding coupling for a discoverability nicety.

### 2026-06-30 — Tester — No automated test framework in pm-app; verification is static review + documented manual smoke
The pm-app `package.json` has no vitest / jest / playwright in deps, and the Architect's "no new deps" constraint precludes adding one in this slice. Coverage for this feature is therefore (a) a static review of each AC against the implementing file + line, recorded in `## Verify` of todo.md as `V1`..`V20` (all passing), and (b) a documented manual smoke plan `V21`..`V30` the user can step through once Supabase + the `generate-digest` Edge Function are deployed. Adding vitest + a few unit tests around the pure utilities (`todayLocalDate`, `yesterdayLocalDate`, EntryHistory's date filter, the stale-hint comparison, the weekend short-circuit) is a clean follow-up — none of those need a DOM or a network. typecheck and build are clean as of this report.

### 2026-06-30 — Tester — Marked Developer + Tester checkboxes after green static review
Set both `Developer` and `Tester` in spec.md to `[x]` since the Build items in todo.md were already all `[x]` (developer self-marked) and the static review against the BA's ACs surfaced no violations. The remaining manual smoke items are gated on live infra that this environment cannot reach, not on missing implementation.

### 2026-06-30 — Developer — Weekend check via `new Date().getDay()` in host TZ, no `Intl` ceremony
For the dot's weekend short-circuit, `getDay()` returns 0/6 in the host timezone — the same timezone `todayLocalDate()` uses for the date itself. Using `Intl.DateTimeFormat` to derive the weekday would be more explicit but identical in result; the simpler call keeps the hook lean. If the user's host TZ differs from their account TZ (rare), both the date key and the weekday agree, so they stay consistent.
