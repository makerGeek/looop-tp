# PM App

A pure-frontend project management app talking directly to Supabase
(Postgres + Auth + Storage) from the browser. No custom server.

## Stack

- **Vite 6** + **React 19** + **TypeScript strict**
- **Tailwind v4** (CSS-first `@theme`)
- **React Router 7** (SPA routing)
- **TanStack Query 5** (server-state cache)
- **@supabase/supabase-js** (auth + DB + storage from the client)
- **@dnd-kit/core** (drag-and-drop board)
- **react-markdown + remark-gfm** (markdown rendering in tasks + comments)
- **lucide-react** icons

## Stage 1 — what's working

- Email/password auth (Supabase Auth)
- Auto-created personal workspace on first sign-in
- Projects list + create
- Project board with 5 fixed columns (Backlog / Up next / In progress /
  In review / Done) and drag-and-drop reordering across columns
- Task drawer: inline-editable title, motivation, markdown description,
  comments thread, drag-and-drop file attachments to Supabase Storage
  with inline previews (image / video / PDF / file)
- Inbox at `/` showing tasks assigned to me, most recently changed first
- Cmd-K (Ctrl-K) command bar: navigate, jump to projects, create task
- `Esc` closes drawer + command bar

## Setup

```bash
cd pm-app
pnpm install
cp .env.example .env.local
# fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from
# Supabase dashboard → Project Settings → API
pnpm dev
```

App boots at `http://localhost:5173`.

## Supabase setup

The schema lives in `supabase/migrations/0001_init.sql`. Apply it once
via the Supabase SQL editor or `supabase db push`. It will:

- Create the workspace / project / task / comment / attachment tables
- Enable RLS scoped to workspace membership
- Create the `attachments` storage bucket with matching policies
- Set the `task_status` enum (5 fixed values, no custom workflows)

## Edge Functions

The `generate-digest` function (used by the Daily sync feature) lives at
`pm-app/supabase/functions/generate-digest/` and runs on Supabase Edge
Functions (Deno). It calls Claude Haiku via `@anthropic-ai/sdk` to
summarise the day's standup entries.

### One-time setup

1. Install the Supabase CLI — see
   [https://supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli).
2. Link this repo to your Supabase project (run from the `pm-app/`
   directory):

   ```bash
   supabase link --project-ref <your-project-ref>
   ```

   The project ref is the subdomain of your Supabase project URL
   (`https://<ref>.supabase.co`).

### Set the Anthropic secret

The function needs an Anthropic API key. Set it as a Supabase secret so
it's available at runtime:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the
Edge runtime and don't need to be configured.

### Deploy

```bash
supabase functions deploy generate-digest
```

### Local development

Copy the env template and fill in your key:

```bash
cp pm-app/supabase/functions/.env.example pm-app/supabase/functions/.env
# edit .env and paste your ANTHROPIC_API_KEY
```

Then serve the function locally:

```bash
supabase functions serve generate-digest --env-file pm-app/supabase/functions/.env
```

The function will be available at
`http://localhost:54321/functions/v1/generate-digest`.

## Original suggested schema (kept for reference)

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  assignee_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table tasks enable row level security;

-- Each user only sees projects they own (extend later for members).
create policy "owners read own projects"
  on projects for select using (owner_id = auth.uid());
create policy "owners write own projects"
  on projects for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "tasks visible if project visible"
  on tasks for all using (
    exists (select 1 from projects p where p.id = tasks.project_id
            and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = tasks.project_id
            and p.owner_id = auth.uid())
  );
```

## Layout

```
pm-app/
├── index.html
├── vite.config.ts
├── tsconfig*.json
├── .env.example
└── src/
    ├── main.tsx
    ├── App.tsx           # router + react-query provider
    ├── styles.css        # Tailwind v4 @theme
    ├── lib/
    │   ├── supabase.ts   # client singleton
    │   └── cn.ts
    ├── hooks/
    │   └── use-session.ts
    ├── components/
    │   ├── AppLayout.tsx # sidebar + outlet
    │   └── RequireAuth.tsx
    └── pages/
        ├── SignIn.tsx
        ├── Dashboard.tsx
        ├── Projects.tsx
        └── Tasks.tsx
```
