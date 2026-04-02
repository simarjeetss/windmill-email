-- ═══════════════════════════════════════════════════════════════════════════════
-- ReachKit — full schema bootstrap
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 001: Campaigns & Contacts ────────────────────────────────────────────────

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

alter table campaigns enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'campaigns' and policyname = 'campaigns: owner full access'
  ) then
    create policy "campaigns: owner full access"
      on campaigns for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'campaigns_updated_at'
  ) then
    create trigger campaigns_updated_at
      before update on campaigns
      for each row execute procedure update_updated_at();
  end if;
end $$;

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

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'contacts' and policyname = 'contacts: owner full access'
  ) then
    create policy "contacts: owner full access"
      on contacts for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists campaigns_user_id_idx  on campaigns(user_id);
create index if not exists contacts_campaign_id_idx on contacts(campaign_id);
create index if not exists contacts_user_id_idx   on contacts(user_id);


-- ─── 002: Email Templates ─────────────────────────────────────────────────────

create table if not exists email_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'Untitled template',
  subject     text not null default '',
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table email_templates enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_templates' and policyname = 'email_templates: owner full access'
  ) then
    create policy "email_templates: owner full access"
      on email_templates for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'email_templates_updated_at'
  ) then
    create trigger email_templates_updated_at
      before update on email_templates
      for each row execute procedure update_updated_at();
  end if;
end $$;

create index if not exists email_templates_user_id_idx on email_templates(user_id);


-- ─── 003: User Profiles (sender identity) ────────────────────────────────────

create table if not exists public.user_profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  company     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_profiles' and policyname = 'users can read own profile'
  ) then
    create policy "users can read own profile"
      on public.user_profiles for select
      using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_profiles' and policyname = 'users can upsert own profile'
  ) then
    create policy "users can upsert own profile"
      on public.user_profiles for insert
      with check (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_profiles' and policyname = 'users can update own profile'
  ) then
    create policy "users can update own profile"
      on public.user_profiles for update
      using (auth.uid() = id);
  end if;
end $$;

create or replace function public.update_profile_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_profile_updated_at'
  ) then
    create trigger trg_profile_updated_at
      before update on public.user_profiles
      for each row execute procedure public.update_profile_updated_at();
  end if;
end $$;


-- ─── 005: Sent Emails + Tracking ────────────────────────────────────────────

create table if not exists sent_emails (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  contact_id  uuid not null references contacts(id) on delete cascade,
  subject     text not null,
  body        text not null,
  status      text not null default 'pending'
                check (status in ('pending', 'sent', 'failed')),
  resend_id   text,
  error       text,
  sent_at     timestamptz,
  opened_at   timestamptz,
  clicked_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table sent_emails enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'sent_emails' and policyname = 'sent_emails: owner full access'
  ) then
    create policy "sent_emails: owner full access"
      on sent_emails for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'sent_emails_updated_at'
  ) then
    create trigger sent_emails_updated_at
      before update on sent_emails
      for each row execute procedure update_updated_at();
  end if;
end $$;

create index if not exists sent_emails_user_id_idx on sent_emails(user_id);
create index if not exists sent_emails_campaign_id_idx on sent_emails(campaign_id);
create index if not exists sent_emails_contact_id_idx on sent_emails(contact_id);
