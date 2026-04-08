-- ─── 011: Campaign send runs (async orchestration) ───────────────────────────
-- Safe to run multiple times.

create table if not exists campaign_send_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  subject text not null,
  body text not null,
  attachment_ids jsonb not null default '[]'::jsonb,
  total_count int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table campaign_send_runs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'campaign_send_runs' and policyname = 'campaign_send_runs: owner full access'
  ) then
    create policy "campaign_send_runs: owner full access"
      on campaign_send_runs for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'campaign_send_runs_updated_at'
  ) then
    create trigger campaign_send_runs_updated_at
      before update on campaign_send_runs
      for each row execute procedure update_updated_at();
  end if;
end $$;

create index if not exists campaign_send_runs_user_id_idx on campaign_send_runs(user_id);
create index if not exists campaign_send_runs_campaign_id_idx on campaign_send_runs(campaign_id);
create index if not exists campaign_send_runs_status_idx on campaign_send_runs(status);
create index if not exists campaign_send_runs_created_at_idx on campaign_send_runs(created_at desc);

create unique index if not exists campaign_send_runs_active_unique_idx
  on campaign_send_runs(user_id, campaign_id)
  where status in ('queued', 'running');

alter table sent_emails add column if not exists run_id uuid references campaign_send_runs(id) on delete set null;

create index if not exists sent_emails_run_id_idx on sent_emails(run_id);

create unique index if not exists sent_emails_run_contact_uidx
  on sent_emails(run_id, contact_id)
  where run_id is not null;
