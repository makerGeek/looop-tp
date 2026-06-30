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
- [ ] B-A4. Create `pm-app/src/lib/queries/standup.ts` exporting
  `getMyEntry`, `listMyHistory`, `listTodayEntries`, `upsertMyEntry`,
  `getDigest`, `invokeGenerateDigest`. Local date is computed
  client-side via `Intl.DateTimeFormat`. (covers AC 1.2, AC 2.1, AC 4.1,
  AC 5.1)
- [ ] B-A5. Scaffold the Supabase Edge Function at
  `pm-app/supabase/functions/generate-digest/` (index.ts + deno.json) —
  parses `{ workspace_id, local_date }`, verifies workspace membership
  via service-role client, returns 403 on miss. (covers AC 3.4)
- [ ] B-A6. In the Edge Function, short-circuit with
  `{ empty: true, reason: 'no_entries' }` when no entries exist for the
  date — no Anthropic call made. (covers AC 3.2)
- [ ] B-A7. In the Edge Function, call Claude Haiku via
  `@anthropic-ai/sdk` with a system prompt that names submitters per
  bullet (attribution) and uses `cache_control: { type: 'ephemeral' }`
  on the system block. (covers AC 3.1, AC 3.3)
- [ ] B-A8. In the Edge Function, upsert the result into `daily_digest`
  keyed on `(workspace_id, local_date)` so re-runs replace, not
  duplicate. (covers AC 6.3)
- [ ] B-A9. Add a per-workspace 30 s rate-limit inside the Edge Function
  (in-memory token bucket); return 429 when triggered. (mitigates AI
  cost risk, supports AC 6.1 without enabling spam)
- [ ] B-A10. Add `pm-app/supabase/functions/.env.example` documenting
  `ANTHROPIC_API_KEY` and update `pm-app/README.md` with an "Edge
  Functions" section explaining
  `supabase functions deploy generate-digest`. (deploy / ops)

### Designer-added UI build items

- [ ] B-D1. Add `Daily sync` sidebar nav entry (with `Sunrise` icon) and
  the `/sync` route to `AppLayout` + `App.tsx` router. (covers AC 1.1, AC 1.4)
- [ ] B-D2. Build the `DailySync` page shell — two-column desktop, single
  column < 640px, page H1 "Daily sync" + subtitle. (covers AC 1.1)
- [ ] B-D3. Build the entry form component with the three labelled
  textareas (Yesterday / Today / Blockers), Submit disabled until ≥ 1
  field is non-empty, Cmd+Enter submit, helper text. (covers AC 1.1,
  AC 1.2, AC 1.3)
- [ ] B-D4. Build the submitted/read-only state with field-by-field
  markdown rendering, saved-at timestamp, and `Edit` button to switch
  back to the editable form. (covers AC 2.1, AC 2.2)
- [ ] B-D5. Build the "yesterday's entry is read-only / fresh empty
  form for today" handling using user's local date. (covers AC 2.3)
- [ ] B-D6. Build the team digest card: `AI-generated` chip (Sparkles
  icon, `bg-primary/15` pill), prose body (Markdown), meta line, and
  `Regenerate` button. (covers AC 3.1, AC 3.5, AC 6.3)
- [ ] B-D7. Build the digest empty state ("No entries yet today…")
  shown when no teammate has submitted. (covers AC 3.2)
- [ ] B-D8. Build the digest loading / regenerating state — skeleton,
  spinner, dimmed previous digest behind. (covers AC 6.2)
- [ ] B-D9. Build the digest stale-hint banner when the user's latest
  entry post-dates the digest. (covers AC 6.1)
- [ ] B-D10. Build the coverage strip — avatar list with submitted /
  not-submitted styling and accessible labels; updates after submit
  without full reload. (covers AC 5.1, AC 5.2)
- [ ] B-D11. Build the `History` disclosure with collapsed / expanded /
  empty states and read-only past entries. (covers AC 4.1, AC 4.2)
- [ ] B-D12. Add Cmd-K entries "Go to Daily sync" and "Submit today's
  standup" (the latter navigates to `/sync` and focuses the first
  textarea). (supports Story 1, Story 2 discoverability)
- [ ] B-D13. Add sidebar "you haven't submitted today" dot indicator
  on the Daily sync nav item. (supports Story 1 discoverability)

## Verify
<!-- Tester will fill these in as V1, V2, … -->
