-- Migration 006: AI generation usage counter
-- Tracks how many AI generations each user has consumed.
-- Free-tier limit is enforced at the application layer (15 requests).

alter table public.user_profiles
  add column if not exists ai_generation_count integer not null default 0;
