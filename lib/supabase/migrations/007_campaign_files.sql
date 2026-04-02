-- Phase 7: Campaign file uploads
-- Stores metadata for files uploaded during contact imports.
-- The actual files are stored in Supabase Storage bucket "campaign-files".

-- ─── campaign_files table ─────────────────────────────────────────────────────

create table if not exists campaign_files (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  file_name    text not null,
  file_size    bigint not null default 0,
  content_type text not null default 'application/octet-stream',
  storage_path text not null,
  created_at   timestamptz not null default now()
);

alter table campaign_files enable row level security;

create policy "campaign_files: owner full access"
  on campaign_files for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists campaign_files_campaign_id_idx on campaign_files(campaign_id);
create index if not exists campaign_files_user_id_idx on campaign_files(user_id);

-- ─── Supabase Storage bucket ──────────────────────────────────────────────────
-- Run this in the SQL editor to create the bucket (if it doesn't exist yet):
--
--   insert into storage.buckets (id, name, public)
--   values ('campaign-files', 'campaign-files', false)
--   on conflict (id) do nothing;
--
-- No storage RLS policies are needed. The app uses the service-role admin
-- client for all storage operations, which bypasses RLS entirely.
