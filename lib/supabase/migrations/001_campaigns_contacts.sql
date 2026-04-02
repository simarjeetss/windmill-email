-- Phase 2: Campaigns & Contacts schema
-- Run this in the Supabase SQL editor

-- ─── Campaigns ────────────────────────────────────────────────────────────────

create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  status      text not null default 'draft'
                check (status in ('draft', 'active', 'paused', 'completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Row-level security: each user only sees their own campaigns
alter table campaigns enable row level security;

create policy "campaigns: owner full access"
  on campaigns for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute procedure update_updated_at();

-- ─── Contacts ─────────────────────────────────────────────────────────────────

create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  first_name  text,
  last_name   text,
  company     text,
  created_at  timestamptz not null default now()
);

alter table contacts enable row level security;

create policy "contacts: owner full access"
  on contacts for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists campaigns_user_id_idx on campaigns(user_id);
create index if not exists contacts_campaign_id_idx on contacts(campaign_id);
create index if not exists contacts_user_id_idx on contacts(user_id);
