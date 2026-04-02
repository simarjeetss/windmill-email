-- ─── 009: Email events (append-only analytics) + delivery timestamps on sent_emails ─
-- Safe to run multiple times.

-- Denormalized delivery / engagement timestamps for fast queries (also in email_events).
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

-- Idempotency: one row per Svix / provider delivery id
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
