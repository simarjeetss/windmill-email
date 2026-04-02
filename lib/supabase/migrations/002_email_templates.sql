-- Phase 3: Email templates schema
-- Run this in the Supabase SQL editor after 001_campaigns_contacts.sql

create table if not exists email_templates (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject     text not null default '',
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- one template per campaign
  unique (campaign_id)
);

alter table email_templates enable row level security;

create policy "email_templates: owner full access"
  on email_templates for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger email_templates_updated_at
  before update on email_templates
  for each row execute procedure update_updated_at();

-- Index
create index if not exists email_templates_campaign_id_idx on email_templates(campaign_id);
