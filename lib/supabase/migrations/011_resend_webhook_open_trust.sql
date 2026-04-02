-- ─── 011: Trust Resend webhook opens for webhook-only tracking mode ─
-- Backfill older webhook open rows that were marked suspected bot.

update email_events
set
  is_suspected_bot = false,
  confidence = greatest(confidence, 0.9)
where event_source = 'resend_webhook'
  and event_type = 'open'
  and is_suspected_bot = true;
