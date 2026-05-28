-- DSAR tables and RLS (UK GDPR / DUAA 2025)

create extension if not exists pgcrypto;

do $$ begin
  create type dsar_type as enum ('access','erasure','rectification');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dsar_status as enum ('received','in_progress','paused','completed','rejected');
exception when duplicate_object then null; end $$;

create table if not exists dsar_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  request_type dsar_type not null,
  status dsar_status not null default 'received',
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  paused_until timestamptz,
  resolution_at timestamptz,
  verification_level text,
  notes jsonb default '{}'::jsonb
);

create table if not exists dsar_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references dsar_requests(id) on delete cascade,
  event text not null,
  detail jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table dsar_requests enable row level security;
alter table dsar_events enable row level security;

do $$ begin
  create policy dsar_requests_sel_own on dsar_requests
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy dsar_requests_ins_own on dsar_requests
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy dsar_events_sel_own on dsar_events
    for select using (
      exists (
        select 1 from dsar_requests r where r.id = dsar_events.request_id and r.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- Indexes
create index if not exists idx_dsar_requests_user on dsar_requests(user_id);
create index if not exists idx_dsar_requests_status on dsar_requests(status);
create index if not exists idx_dsar_events_request on dsar_events(request_id);


