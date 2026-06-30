# Todo — ai-powered-async-daily-sync

## Discovery
- [x] BA: user stories + acceptance criteria
- [x] Architect: technical approach
- [x] Designer: UX / API surface

## Build
<!-- Architect + Designer will fill these in as B1, B2, … -->

### Architect-added backend / data build items

- [x] B-A1. Write migration `pm-app/supabase/migrations/0002_async_standup.sql`
  creating `async_standup` and `daily_digest` tables, the unique
  constraint on `(workspace_id, user_id, local_date)`, indexes, and the
  `updated_at` trigger. (covers AC 1.2, AC 2.2)
- [x] B-A2. Enable RLS on both new tables and add policies: members read
  on `async_standup`, self-only insert/update/delete on `async_standup`,
  members read on `daily_digest` (no anon write policy). (covers AC 3.4,
  enforces "no editing other people's entries" non-goal)
- [x] B-A3. Add `AsyncStandup` and `DailyDigest` TypeScript interfaces
  to `pm-app/src/lib/types.ts` matching the schema columns. (covers
  AC 1.2, AC 3.1)
- [x] B-A4. Create `pm-app/src/lib/queries/standup.ts` exporting
  `getMyEntry`, `listMyHistory`, `listTodayEntries`, `upsertMyEntry`,
  `getDigest`, `invokeGenerateDigest`. Local date is computed
  client-side via `Intl.DateTimeFormat`. (covers AC 1.2, AC 2.1, AC 4.1,
  AC 5.1)
- [x] B-A5. Scaffold the Supabase Edge Function at
  `pm-app/supabase/functions/generate-digest/` (index.ts + deno.json) —
  parses `{ workspace_id, local_date }`, verifies workspace membership
  via service-role client, returns 403 on miss. (covers AC 3.4)
- [x] B-A6. In the Edge Function, short-circuit with
  `{ empty: true, reason: 'no_entries' }` when no entries exist for the
  date — no Anthropic call made. (covers AC 3.2)
- [x] B-A7. In the Edge Function, call Claude Haiku via
  `@anthropic-ai/sdk` with a system prompt that names submitters per
  bullet (attribution) and uses `cache_control: { type: 'ephemeral' }`
  on the system block. (covers AC 3.1, AC 3.3)
- [x] B-A8. In the Edge Function, upsert the result into `daily_digest`
  keyed on `(workspace_id, local_date)` so re-runs replace, not
  duplicate. (covers AC 6.3)
- [x] B-A9. Add a per-workspace 30 s rate-limit inside the Edge Function
  (in-memory token bucket); return 429 when triggered. (mitigates AI
  cost risk, supports AC 6.1 without enabling spam)
- [x] B-A10. Add `pm-app/supabase/functions/.env.example` documenting
  `ANTHROPIC_API_KEY` and update `pm-app/README.md` with an "Edge
  Functions" section explaining
  `supabase functions deploy generate-digest`. (deploy / ops)

### Designer-added UI build items

- [x] B-D1. Add `Daily sync` sidebar nav entry (with `Sunrise` icon) and
  the `/sync` route to `AppLayout` + `App.tsx` router. (covers AC 1.1, AC 1.4)
- [x] B-D2. Build the `DailySync` page shell — two-column desktop, single
  column < 640px, page H1 "Daily sync" + subtitle. (covers AC 1.1)
- [x] B-D3. Build the entry form component with the three labelled
  textareas (Yesterday / Today / Blockers), Submit disabled until ≥ 1
  field is non-empty, Cmd+Enter submit, helper text. (covers AC 1.1,
  AC 1.2, AC 1.3)
- [x] B-D4. Build the submitted/read-only state with field-by-field
  markdown rendering, saved-at timestamp, and `Edit` button to switch
  back to the editable form. (covers AC 2.1, AC 2.2)
- [x] B-D5. Build the "yesterday's entry is read-only / fresh empty
  form for today" handling using user's local date. (covers AC 2.3)
- [x] B-D6. Build the team digest card: `AI-generated` chip (Sparkles
  icon, `bg-primary/15` pill), prose body (Markdown), meta line, and
  `Regenerate` button. (covers AC 3.1, AC 3.5, AC 6.3)
- [x] B-D7. Build the digest empty state ("No entries yet today…")
  shown when no teammate has submitted. (covers AC 3.2)
- [x] B-D8. Build the digest loading / regenerating state — skeleton,
  spinner, dimmed previous digest behind. (covers AC 6.2)
- [x] B-D9. Build the digest stale-hint banner when the user's latest
  entry post-dates the digest. (covers AC 6.1)
- [x] B-D10. Build the coverage strip — avatar list with submitted /
  not-submitted styling and accessible labels; updates after submit
  without full reload. (covers AC 5.1, AC 5.2)
- [x] B-D11. Build the `History` disclosure with collapsed / expanded /
  empty states and read-only past entries. (covers AC 4.1, AC 4.2)
- [x] B-D12. Add Cmd-K entries "Go to Daily sync" and "Submit today's
  standup" (the latter navigates to `/sync` and focuses the first
  textarea). (supports Story 1, Story 2 discoverability)
- [x] B-D13. Add sidebar "you haven't submitted today" dot indicator
  on the Daily sync nav item. (supports Story 1 discoverability)

## Verify

Coverage strategy: pm-app has no test runner (no vitest/jest in deps), and
the Architect's "no new deps" constraint rules out adding one in this slice.
So verification is **static review** + a **documented manual smoke pass**.
Typecheck (`pnpm typecheck`) and build (`pnpm build`) are clean.

### Static review (validated by reading source)

- [x] V1. AC 1.1 — empty form renders three labelled textareas (Yesterday /
  Today / Blockers) with placeholders and a Submit button on first visit.
  *Static: `EntryForm.tsx:204-230` — three `<Field>` components labelled,
  placeholders match designer copy; Submit at line 242.*
- [x] V2. AC 1.2 — submit with ≥ 1 non-empty field upserts one row on
  `(workspace_id, user_id, local_date)` and surface re-renders submitted.
  *Static: `canSubmit` at `EntryForm.tsx:100-106` checks ≥ 1 trimmed
  field; `upsertMyEntry` at `queries/standup.ts:61-86` uses
  `onConflict: "workspace_id,user_id,local_date"`; DB-level unique
  constraint at `0002_async_standup.sql:21`; post-save flips
  `editing=false` (line 124) → submitted view.*
- [x] V3. AC 1.3 — verbatim content (plaintext or markdown). *Static:
  `upsertMyEntry` passes the raw state values; no trim / sanitise /
  transform anywhere in the path.*
- [x] V4. AC 1.4 — when not submitted today, surface shows the entry form
  (not the digest). *Static: `EntryForm` defaults to `editing=true` when
  no existing entry (`EntryForm.tsx:69-71`); the digest card is a
  separate right-column component that shows empty-state when no
  digest exists.*
- [x] V5. AC 2.1 — re-opening after submit pre-fills + allows edit.
  *Static: on mount with an existing entry, all three field states are
  seeded from the entry (`EntryForm.tsx:64-68`) and the Edit button
  flips back to editable form (`onEdit` at line 144-152).*
- [x] V6. AC 2.2 — edit re-submit updates same row. *Static: same
  upsert path; DB unique constraint guarantees one row per
  `(workspace_id, user_id, local_date)`; `set_updated_at` trigger
  bumps `updated_at` on each write (`0002_async_standup.sql:29-31`).*
- [x] V7. AC 2.3 — day rollover: yesterday's entry is read-only,
  today's form is fresh. *Static: `YesterdayEntry.tsx:17-70` renders
  yesterday's entry read-only when present; `EntryForm` queries by
  `todayLocalDate()` so the new day surfaces an empty form. Caveat: the
  date is captured via `useMemo([])`, so a page held open across
  midnight needs a reload to roll over — acceptable per BA non-goals.*
- [x] V8. AC 3.1 — digest summarises team entries into prose. *Static:
  Edge Function (`generate-digest/index.ts:309-332`) calls Claude
  Haiku with a system prompt that produces three markdown sections;
  `DigestCard.tsx:177` renders via `react-markdown`.*
- [x] V9. AC 3.2 — empty state when no entries; no AI call made.
  *Static: function short-circuits `rows.length === 0` at
  `index.ts:283-285` returning `{ empty: true, reason: "no_entries" }`
  before any Anthropic call; `DigestCard.tsx:91-104` renders the
  dashed-border empty card when `!digest`.*
- [x] V10. AC 3.3 — every claim is attributed to a submitter. *Static:
  `SYSTEM_PROMPT` at `index.ts:20-40` explicitly instructs the model
  to name submitters in parentheses per bullet; `attributionFor`
  resolves a name (or email-local, or `user_id` slice fallback) per
  entry. Caveat: model adherence is not testable from static review —
  see manual smoke V21.*
- [x] V11. AC 3.4 — digest scoped to current workspace only. *Static:
  function filters `async_standup` by `workspace_id` (line 273) and
  RLS on `async_standup` requires `is_workspace_member(workspace_id)`
  on select. Same applies to the digest read on the client. Cross-WS
  leak impossible at DB layer.*
- [x] V12. AC 3.5 — AI-generated label visible. *Static:
  `DigestCard.tsx:143-149` shows a `bg-primary/15` pill with Sparkles
  icon and the text "AI-generated", plus
  `aria-label="This content was generated by AI"`.*
- [x] V13. AC 4.1 — history shows past entries chronologically with
  date + 3 fields. *Static: `EntryHistory.tsx` calls `listMyHistory`
  (which orders `local_date desc` in `queries/standup.ts:42`),
  filters out today + yesterday, renders each via `PastEntryCard`
  with date header + Yesterday/Today/Blockers sections.*
- [x] V14. AC 4.2 — past entries are read-only. *Static:
  `PastEntryCard` (`EntryHistory.tsx:144-159`) renders all three
  fields with `ReadOnlySection` (markdown only, no inputs, no
  buttons).*
- [x] V15. AC 5.1 — coverage strip shows submitted vs not-submitted
  for all members. *Static: `CoverageStrip.tsx:48-66` joins
  `listMembers(workspace_id)` with `listTodayEntries`; each row gets
  `submitted: boolean`; the strip styles submitted avatars with
  primary background, not-submitted with muted + opacity-60; counts
  shown ("N of M submitted today"). aria-labels per avatar present.*
- [x] V16. AC 5.2 — coverage updates without full page reload after
  submit. *Static: `DailySync.tsx:12` holds `refreshKey` state;
  `EntryForm`'s `onSubmitted` bumps it (line 33); `CoverageStrip`'s
  `useEffect` deps include `refreshKey` (line 66) → re-fetches.*
- [x] V17. AC 6.1 — explicit regenerate trigger. *Static:
  `DigestCard.tsx:150-167` renders a Regenerate button calling
  `invokeGenerateDigest`; a stale-hint banner with its own
  Regenerate button surfaces when the user's own entry post-dates
  the digest (lines 107-135). The Edge Function honours requests
  any number of times; only the 30 s rate-limit caps spam.*
- [x] V18. AC 6.2 — loading state, previous digest stays. *Static:
  during `regenerating`, the previous markdown body is rendered at
  `opacity-50` (`DigestCard.tsx:170-185`) with a spinner + label
  beneath; on Anthropic failure (`index.ts:342-347`) the function
  returns 503 *without* upserting, so the prior `daily_digest` row
  is preserved.*
- [x] V19. AC 6.3 — only the latest digest is shown. *Static:
  `daily_digest` PK is `(workspace_id, local_date)`
  (`0002_async_standup.sql:41`); the Edge Function upsert
  (`index.ts:351-364`) uses `onConflict: "workspace_id,local_date"`
  → replaces in place; the client query reads a single row via
  `maybeSingle()` (`queries/standup.ts:97`).*
- [x] V20. RLS — self-only write, members read, no anon write on
  digest. *Static review of `0002_async_standup.sql:48-78`:
  `async_standup` SELECT gated on `is_workspace_member`; INSERT
  requires membership AND `user_id = auth.uid()`; UPDATE has both
  using + with check on `user_id = auth.uid()` (with-check also
  reasserts membership so a row can't be reparented to another
  workspace); DELETE limited to `user_id = auth.uid()`.
  `daily_digest` SELECT gated on `is_workspace_member`; no anon
  INSERT/UPDATE policy → writes only via service-role (Edge Fn),
  matching the architect's "closed by default" intent.*

### Manual smoke (requires deployed Supabase + Edge Function)

These require the migration applied and `generate-digest` deployed with
`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ANON_KEY` secrets set. Signed in as a workspace member with
≥ 1 other teammate also a member.

- [ ] V21. AC 3.3 (live) — Two teammates submit different entries; click
  Regenerate; verify each bullet in the digest names a submitter in
  parentheses (matches the SYSTEM_PROMPT contract). *Repro:* sign in as
  user A, submit `Yesterday: Shipped feature X`; sign in as user B in a
  second profile, submit `Today: Reviewing PR #42`; back as A, click
  Regenerate; expect bullets like `- Shipped feature X (alice)` and
  `- Reviewing PR #42 (bob)`.
- [ ] V22. AC 3.4 (live) — Create entries in two distinct workspaces on
  the same date with the same logged-in user. Generate digest in WS-1;
  confirm the digest only mentions WS-1 entries, not WS-2.
- [ ] V23. AC 6.1 + rate-limit — Hit Regenerate twice within 30 s. First
  succeeds (or returns existing). Second returns 429 with `Retry-After`
  header. UI surfaces "Couldn't regenerate. Try again in a sec."
- [ ] V24. AC 6.2 — Force an Anthropic failure (e.g. set
  `ANTHROPIC_API_KEY` to an obviously bad value, redeploy), click
  Regenerate. Function returns 503; previous digest stays visible;
  no daily_digest row mutation. Restore key.
- [ ] V25. AC 3.5 (visual) — Inspect the digest card: AI-generated chip
  visible top-left with Sparkles icon. Screen reader announces "This
  content was generated by AI" via the chip's aria-label.
- [ ] V26. AC 5.2 (live) — Open `/sync` as user A; observe coverage
  strip shows A as not-submitted. Submit entry; observe coverage strip
  updates A to submitted **without** a page reload (no navigation).
- [ ] V27. AC 1.4 / 2.3 (rollover) — At day rollover, reload `/sync`:
  the entry form is empty again; yesterday's entry shows read-only in
  the YesterdayEntry block; the History disclosure list excludes
  yesterday and today (both surfaced elsewhere).
- [ ] V28. Cmd-K — Open Cmd-K, run "Go to Daily sync" → navigates to
  `/sync`. Run "Submit today's standup" → navigates AND the Yesterday
  textarea is focused (only when the form is in editable mode; if the
  user already submitted today, focus is a silent no-op).
- [ ] V29. Sidebar dot — Sign in on a weekday morning with no entry for
  today: the Daily sync sidebar link has a primary-coloured pulse dot
  on the right edge. Submit an entry, then navigate away and back (or
  blur+focus the tab): dot disappears. On a Saturday, no dot regardless.
- [ ] V30. RLS via SQL — In the Supabase SQL editor, sign in as user
  from workspace A and try:
  `update async_standup set today='hax' where user_id = '<user-from-B>';`
  → expect 0 rows updated (RLS blocks). Also try:
  `insert into daily_digest (workspace_id, local_date, body_md, model,
  entry_count) values (...);` with the anon key → expect a policy
  violation. With the service-role key → works (the Edge Function path).

### Outcome

Static review found no AC violations and confirmed both the data-layer
constraints (unique index, PK, RLS policies) and the Edge Function
contract (empty-state short-circuit, attribution prompt, 503-on-failure,
upsert idempotency). Manual smoke items V21–V30 require a live Supabase
+ deployed Edge Function and are deferred to the user.
