-- ─── 004: Email Templates v2 ──────────────────────────────────────────────────
-- Converts email_templates from "one per campaign" to a free-form template library.
-- Safe to run on fresh DBs (table may not exist yet) and on existing DBs.
-- Run in Supabase SQL Editor after 001-003 have been applied.

-- 1. Create the new table if it doesn't exist at all (fresh DB)
create table if not exists email_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'Untitled template',
  subject     text not null default '',
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. If the table already existed with the old schema, migrate it:

-- Add "name" column if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'email_templates' and column_name = 'name'
  ) then
    alter table email_templates add column name text not null default 'Untitled template';
  end if;
end $$;

-- Drop campaign_id column if it still exists
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'email_templates' and column_name = 'campaign_id'
  ) then
    alter table email_templates drop column campaign_id;
  end if;
end $$;

-- Drop the unique constraint on campaign_id if it still exists
do $$ begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'email_templates'::regclass
      and contype = 'u'
      and conname like '%campaign_id%'
  ) then
    execute (
      select 'alter table email_templates drop constraint ' || conname
      from pg_constraint
      where conrelid = 'email_templates'::regclass
        and contype = 'u'
        and conname like '%campaign_id%'
      limit 1
    );
  end if;
end $$;

-- 3. Enable RLS (idempotent)
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

-- 4. Updated-at trigger (idempotent)
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'email_templates_updated_at'
  ) then
    create trigger email_templates_updated_at
      before update on email_templates
      for each row execute procedure update_updated_at();
  end if;
end $$;

-- 5. Index
create index if not exists email_templates_user_id_idx on email_templates(user_id);
