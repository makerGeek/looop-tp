-- Stage 2: AI-powered async daily sync.
-- Adds `async_standup` (one entry per user per workspace per local date) and
-- `daily_digest` (one AI-generated summary per workspace per local date).
-- RLS scoped to workspace membership; digest writes go through service-role
-- (Edge Function) only. Run with `supabase db push` or paste into the SQL editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists async_standup (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  local_date   date not null, -- the submitter's local "today"
  yesterday    text not null default '',
  today        text not null default '',
  blockers     text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, user_id, local_date)
);
create index if not exists async_standup_ws_date_idx
  on async_standup(workspace_id, local_date);
create index if not exists async_standup_user_date_idx
  on async_standup(user_id, local_date desc);

-- Reuse set_updated_at() defined in 0001_init.sql.
drop trigger if exists async_standup_touch on async_standup;
create trigger async_standup_touch before update on async_standup
  for each row execute function set_updated_at();

create table if not exists daily_digest (
  workspace_id uuid not null references workspace(id) on delete cascade,
  local_date   date not null,
  body_md      text not null,                       -- AI-generated markdown
  model        text not null,                       -- e.g. 'claude-haiku-4-5'
  entry_count  int  not null,                       -- # entries summarised
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id) on delete set null,
  primary key (workspace_id, local_date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table async_standup enable row level security;
alter table daily_digest  enable row level security;

-- Members of the workspace can read all entries (the digest naturally exposes
-- them anyway; transparency over secrecy in v1).
drop policy if exists "members read standup" on async_standup;
create policy "members read standup" on async_standup
  for select using (is_workspace_member(workspace_id));

-- Members can only insert/update/delete their own row. The non-goal "no
-- editing other people's entries" is enforced here at the database layer.
drop policy if exists "self insert standup" on async_standup;
create policy "self insert standup" on async_standup
  for insert with check (
    is_workspace_member(workspace_id) and user_id = auth.uid()
  );

drop policy if exists "self update standup" on async_standup;
create policy "self update standup" on async_standup
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_workspace_member(workspace_id));

drop policy if exists "self delete standup" on async_standup;
create policy "self delete standup" on async_standup
  for delete using (user_id = auth.uid());

-- Digest: members read; writes go through service-role only (Edge Fn), so we
-- deliberately omit any INSERT/UPDATE/DELETE policy for the anon role.
drop policy if exists "members read digest" on daily_digest;
create policy "members read digest" on daily_digest
  for select using (is_workspace_member(workspace_id));
