-- ─── 012: Campaign send run targeting metadata ──────────────────────────────
-- Safe to run multiple times.

alter table campaign_send_runs
  add column if not exists run_type text not null default 'initial';

alter table campaign_send_runs
  add column if not exists follow_up_segment text;

create index if not exists campaign_send_runs_run_type_idx on campaign_send_runs(run_type);