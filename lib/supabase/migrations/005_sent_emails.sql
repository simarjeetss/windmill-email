-- ─── 005: Sent Emails + Tracking ────────────────────────────────────────────
-- Adds sent_emails table for delivery status + open/click tracking.
-- Safe to run multiple times.

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
