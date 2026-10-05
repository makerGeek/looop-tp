-- SMS gateway schema. Every table is owned by a user and protected by RLS.

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  created_at timestamptz not null default now(),
  unique (user_id, phone_e164)
);

create type public.message_direction as enum ('out', 'in');
create type public.message_status as enum
  ('queued', 'sending', 'sent', 'delivered', 'failed', 'received');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  device_id uuid references public.devices(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  body text not null check (char_length(body) between 1 and 1600),
  direction public.message_direction not null,
  status public.message_status not null,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  check (
    (direction = 'out' and status in ('queued','sending','sent','delivered','failed')) or
    (direction = 'in' and status = 'received')
  )
);

create index messages_user_created_idx on public.messages (user_id, created_at desc);
create index messages_device_queued_idx on public.messages (device_id) where status = 'queued';

alter table public.devices  enable row level security;
alter table public.contacts enable row level security;
alter table public.messages enable row level security;

create policy "own devices"  on public.devices  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own contacts" on public.contacts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own messages read"   on public.messages for select using (user_id = auth.uid());
create policy "own messages update" on public.messages for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own messages delete" on public.messages for delete using (user_id = auth.uid());
-- Inserted rows must belong to a device the user owns (when a device is given).
create policy "own messages insert" on public.messages for insert with check (
  user_id = auth.uid()
  and (device_id is null or exists (
    select 1 from public.devices d where d.id = device_id and d.user_id = auth.uid()))
);

-- Realtime: full row images so UPDATE events carry device_id for filtering.
alter table public.messages replica identity full;
alter table public.devices  replica identity full;
alter publication supabase_realtime add table public.messages, public.devices;
