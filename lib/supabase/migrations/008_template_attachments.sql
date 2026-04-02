-- ─── 008: Email template attachments ─────────────────────────────────────────
-- Files live in Storage bucket "template-attachments" (create in Dashboard if missing):
--   insert into storage.buckets (id, name, public)
--   values ('template-attachments', 'template-attachments', false)
--   on conflict (id) do nothing;
-- Paths: <user_id>/pending/<uuid>_<filename>  OR  <user_id>/<template_id>/<timestamp>_<filename>

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
