-- Migration 003: user profiles (sender identity)
-- Stores the sender's name & company so it's entered once and reused everywhere.

create table if not exists public.user_profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  company     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Row-level security: each user can only see/edit their own row
alter table public.user_profiles enable row level security;

create policy "users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "users can upsert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Auto-bump updated_at
create or replace function public.update_profile_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profile_updated_at
  before update on public.user_profiles
  for each row execute procedure public.update_profile_updated_at();
