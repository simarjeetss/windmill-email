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


-- ─── 008: Template attachments (see 008_template_attachments.sql for Storage bucket setup) ─

create table if not exists email_template_attachments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  template_id  uuid references email_templates(id) on delete cascade,
  file_name    text not null,
  file_size    bigint not null default 0,
  content_type text not null default 'application/octet-stream',
  storage_path text not null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists email_template_attachments_user_id_idx on email_template_attachments(user_id);
create index if not exists email_template_attachments_template_id_idx on email_template_attachments(template_id);

alter table email_template_attachments enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_template_attachments'
      and policyname = 'email_template_attachments: owner full access'
  ) then
    create policy "email_template_attachments: owner full access"
      on email_template_attachments for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ─── 009: Email events + delivery timestamps (see 009_email_events.sql) ─

alter table sent_emails add column if not exists delivered_at timestamptz;
alter table sent_emails add column if not exists bounced_at timestamptz;
alter table sent_emails add column if not exists complaint_at timestamptz;

create index if not exists sent_emails_delivered_at_idx on sent_emails(delivered_at) where delivered_at is not null;

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_email_id uuid references sent_emails(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  event_type text not null
    check (event_type in ('sent', 'delivered', 'open', 'click', 'bounce', 'complaint', 'deferred')),
  event_source text not null
    check (event_source in ('track_pixel', 'track_click', 'resend_webhook', 'system')),
  occurred_at timestamptz not null default now(),
  url text,
  user_agent text,
  ip text,
  provider_message_id text,
  provider_event_id text,
  raw_payload jsonb,
  is_suspected_bot boolean not null default false,
  confidence real not null default 1,
  created_at timestamptz not null default now()
);

create unique index if not exists email_events_provider_event_id_uidx
  on email_events(provider_event_id)
  where provider_event_id is not null;

create index if not exists email_events_user_occurred_idx on email_events(user_id, occurred_at desc);
create index if not exists email_events_campaign_occurred_idx on email_events(campaign_id, occurred_at desc);
create index if not exists email_events_sent_email_occurred_idx on email_events(sent_email_id, occurred_at desc);
create index if not exists email_events_type_idx on email_events(event_type);

alter table email_events enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_events' and policyname = 'email_events: owner full access'
  ) then
    create policy "email_events: owner full access"
      on email_events for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ─── 010: email_event_stats RPC (see 010_email_event_stats.sql) ─

create or replace function public.email_event_stats(
  p_since timestamptz,
  p_campaign_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'delivered_unique', coalesce(count(distinct e.sent_email_id) filter (where e.event_type = 'delivered'), 0),
    'open_unique_raw', coalesce(count(distinct e.sent_email_id) filter (where e.event_type = 'open'), 0),
    'open_unique_trusted', coalesce(
      count(distinct e.sent_email_id) filter (where e.event_type = 'open' and not e.is_suspected_bot),
      0
    ),
    'click_unique', coalesce(count(distinct e.sent_email_id) filter (where e.event_type = 'click'), 0)
  )
  from email_events e
  where e.user_id = auth.uid()
    and e.occurred_at >= p_since
    and (p_campaign_id is null or e.campaign_id = p_campaign_id);
$$;

revoke all on function public.email_event_stats(timestamptz, uuid) from public;
grant execute on function public.email_event_stats(timestamptz, uuid) to authenticated;


-- ─── 011: Background email send jobs ─────────────────────────────────────────

create table if not exists email_send_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  subject text not null,
  body text not null,
  attachment_ids jsonb not null default '[]'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  total_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  claimed_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table email_send_jobs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_send_jobs' and policyname = 'email_send_jobs: owner full access'
  ) then
    create policy "email_send_jobs: owner full access"
      on email_send_jobs for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'email_send_jobs_updated_at'
  ) then
    create trigger email_send_jobs_updated_at
      before update on email_send_jobs
      for each row execute procedure update_updated_at();
  end if;
end $$;

create index if not exists email_send_jobs_user_id_idx on email_send_jobs(user_id);
create index if not exists email_send_jobs_campaign_id_idx on email_send_jobs(campaign_id);
create index if not exists email_send_jobs_status_idx on email_send_jobs(status);
create index if not exists email_send_jobs_created_at_idx on email_send_jobs(created_at desc);

alter table sent_emails
  add column if not exists send_job_id uuid references email_send_jobs(id) on delete set null;

create index if not exists sent_emails_send_job_id_idx on sent_emails(send_job_id);

do $$ begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'sent_emails'
      and constraint_name = 'sent_emails_status_check'
  ) then
    alter table sent_emails drop constraint sent_emails_status_check;
  end if;
end $$;

alter table sent_emails
  add constraint sent_emails_status_check
  check (status in ('pending', 'queued', 'processing', 'sent', 'failed'));

create unique index if not exists sent_emails_send_job_contact_uidx
  on sent_emails(send_job_id, contact_id)
  where send_job_id is not null;

do $$ begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    begin
      alter publication supabase_realtime add table email_send_jobs;
    exception
      when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table sent_emails;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

create or replace function public.claim_email_send_batch(
  p_job_id uuid,
  p_batch_size integer,
  p_stale_before timestamptz default (now() - interval '10 minutes')
)
returns setof sent_emails
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select se.id
    from sent_emails se
    where se.send_job_id = p_job_id
      and (
        se.status = 'queued'
        or (se.status = 'processing' and se.updated_at < p_stale_before)
      )
    order by se.created_at, se.id
    for update skip locked
    limit greatest(coalesce(p_batch_size, 1), 1)
  )
  update sent_emails se
  set status = 'processing',
      error = null
  from picked
  where se.id = picked.id
  returning se.*;
end;
$$;

revoke all on function public.claim_email_send_batch(uuid, integer, timestamptz) from public;
grant execute on function public.claim_email_send_batch(uuid, integer, timestamptz) to authenticated;
