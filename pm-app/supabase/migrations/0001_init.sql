-- Stage 1: workspaces, memberships, projects, tasks, comments, attachments, activity.
-- RLS scoped to workspace membership. Run with `supabase db push` or paste into the SQL editor.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists workspace (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists workspace_member (
  workspace_id uuid not null references workspace(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member', -- 'owner' | 'member' | 'guest'
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists project (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  name         text not null,
  slug         text not null,
  description  text,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  unique (workspace_id, slug)
);
create index if not exists project_workspace_idx on project(workspace_id);

-- Fixed 5-status workflow on purpose (see plan).
create type if not exists task_status as enum
  ('backlog', 'up_next', 'in_progress', 'in_review', 'done');

create table if not exists task (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references project(id) on delete cascade,
  title        text not null,
  motivation   text not null,
  description  text,
  status       task_status not null default 'backlog',
  assignee_id  uuid references auth.users(id) on delete set null,
  due_at       timestamptz,
  position     double precision not null default 1000, -- for ordering within a column
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null
);
create index if not exists task_project_idx on task(project_id);
create index if not exists task_assignee_idx on task(assignee_id);

create table if not exists comment (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references task(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists comment_task_idx on comment(task_id);

create table if not exists attachment (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references task(id) on delete cascade,
  storage_path  text not null,
  filename      text not null,
  mime          text not null,
  size_bytes    bigint not null,
  uploaded_by   uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists attachment_task_idx on attachment(task_id);

-- Touch updated_at on task changes.
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists task_touch on task;
create trigger task_touch before update on task
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table workspace        enable row level security;
alter table workspace_member enable row level security;
alter table project          enable row level security;
alter table task             enable row level security;
alter table comment          enable row level security;
alter table attachment       enable row level security;

-- Helper: is the current user a member of a workspace?
create or replace function is_workspace_member(wid uuid) returns boolean
  language sql security definer set search_path = public as $$
    select exists (
      select 1 from workspace_member
      where workspace_id = wid and user_id = auth.uid()
    );
$$;

-- Workspace: members can read; owners can update; anyone signed in can insert
-- (they immediately become owner via the membership insert from the client).
drop policy if exists "members read workspace" on workspace;
create policy "members read workspace" on workspace
  for select using (is_workspace_member(id));

drop policy if exists "signed-in users create workspace" on workspace;
create policy "signed-in users create workspace" on workspace
  for insert with check (auth.uid() is not null);

drop policy if exists "owners update workspace" on workspace;
create policy "owners update workspace" on workspace
  for update using (
    exists (select 1 from workspace_member
            where workspace_id = workspace.id
              and user_id = auth.uid()
              and role = 'owner')
  );

-- Membership: members see all rows in their workspaces; users can join only
-- themselves (used by the bootstrap step on sign-up).
drop policy if exists "members read memberships" on workspace_member;
create policy "members read memberships" on workspace_member
  for select using (is_workspace_member(workspace_id));

drop policy if exists "self insert membership" on workspace_member;
create policy "self insert membership" on workspace_member
  for insert with check (user_id = auth.uid());

-- Project, task, comment, attachment: gated on workspace membership.
drop policy if exists "members rw project" on project;
create policy "members rw project" on project
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

drop policy if exists "members rw task" on task;
create policy "members rw task" on task
  for all using (
    exists (select 1 from project p
            where p.id = task.project_id and is_workspace_member(p.workspace_id))
  )
  with check (
    exists (select 1 from project p
            where p.id = task.project_id and is_workspace_member(p.workspace_id))
  );

drop policy if exists "members rw comment" on comment;
create policy "members rw comment" on comment
  for all using (
    exists (select 1 from task t join project p on p.id = t.project_id
            where t.id = comment.task_id and is_workspace_member(p.workspace_id))
  )
  with check (
    exists (select 1 from task t join project p on p.id = t.project_id
            where t.id = comment.task_id and is_workspace_member(p.workspace_id))
  );

drop policy if exists "members rw attachment" on attachment;
create policy "members rw attachment" on attachment
  for all using (
    exists (select 1 from task t join project p on p.id = t.project_id
            where t.id = attachment.task_id and is_workspace_member(p.workspace_id))
  )
  with check (
    exists (select 1 from task t join project p on p.id = t.project_id
            where t.id = attachment.task_id and is_workspace_member(p.workspace_id))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage bucket for attachments
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', false)
  on conflict (id) do nothing;

-- Object access mirrors membership of the task's workspace. We encode the
-- workspace_id as the first path segment so a single policy can decide.
-- Path convention: `<workspace_id>/<task_id>/<uuid>-<filename>`
drop policy if exists "members read attachment objects" on storage.objects;
create policy "members read attachment objects" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and is_workspace_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "members write attachment objects" on storage.objects;
create policy "members write attachment objects" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and is_workspace_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "members delete attachment objects" on storage.objects;
create policy "members delete attachment objects" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and is_workspace_member((storage.foldername(name))[1]::uuid)
  );
