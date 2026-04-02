-- ─── 010: RPC for aggregated email event stats (RLS-safe via auth.uid()) ─

create or replace function public.email_event_stats(
  p_since timestamptz,
  p_campaign_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'delivered_unique', coalesce(count(distinct e.sent_email_id) filter (where e.event_type = 'delivered'), 0),
    'open_unique_raw', coalesce(count(distinct e.sent_email_id) filter (where e.event_type = 'open'), 0),
    'open_unique_trusted', coalesce(
      count(distinct e.sent_email_id) filter (where e.event_type = 'open' and not e.is_suspected_bot),
      0
    ),
    'click_unique', coalesce(count(distinct e.sent_email_id) filter (where e.event_type = 'click'), 0)
  )
  from email_events e
  where e.user_id = auth.uid()
    and e.occurred_at >= p_since
    and (p_campaign_id is null or e.campaign_id = p_campaign_id);
$$;

revoke all on function public.email_event_stats(timestamptz, uuid) from public;
grant execute on function public.email_event_stats(timestamptz, uuid) to authenticated;
