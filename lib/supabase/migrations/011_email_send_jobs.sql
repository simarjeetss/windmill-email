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
