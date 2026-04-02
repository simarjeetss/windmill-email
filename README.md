## Building a working prototype that demonstrates core AI-powered email automation capabilities with minimal viable features.

### Phase 4: Email Sending (Resend + Tracking)

Required environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (verified sender in Resend)
- `SUPABASE_SERVICE_ROLE_KEY` (for open/click tracking updates and webhooks)
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` for tracking links)
- `TRACKING_SECRET` (recommended: dedicated secret for HMAC-signed open/click URLs; falls back to `SUPABASE_SERVICE_ROLE_KEY` if unset)
- `RESEND_WEBHOOK_SECRET` (Svix signing secret from Resend Webhooks dashboard — required for `/api/webhooks/resend`)

Database migrations:

- Run `lib/supabase/migrations/005_sent_emails.sql` (and later migrations in order), or apply `lib/supabase/migrations/run_all.sql` in the Supabase SQL Editor.
- For analytics: `009_email_events.sql` and `010_email_event_stats.sql` add the `email_events` table and `email_event_stats` RPC.

Webhooks:

- In Resend, add a webhook pointing to `https://<your-domain>/api/webhooks/resend` and subscribe to delivery, bounce, complaint, open, click, etc.

# IN-PROGRESS# windmill-email
