# Todo — ai-powered-async-daily-sync

## Discovery
- [x] BA: user stories + acceptance criteria
- [x] Architect: technical approach
- [x] Designer: UX / API surface

## Build
<!-- Architect + Designer will fill these in as B1, B2, … -->

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
