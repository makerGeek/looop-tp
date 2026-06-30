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

### 2026-06-30 — Developer — Coverage avatar initials derived from `user_id.slice(0, 8)` for non-self members; email for the signed-in user
We don't yet have a `profile` table, and `auth.users.email` is only readable for the calling user (RLS). The build brief explicitly accepts user_id-based initials as the v1 fallback. The signed-in user gets the nicer email-based label so they can spot themselves in the strip without confusion; everyone else gets a stable two-char initial derived from their id. When a profile table lands, the row builder is the only place to change.
