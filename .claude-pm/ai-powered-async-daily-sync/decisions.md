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
