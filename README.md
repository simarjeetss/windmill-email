## Building a working prototype that demonstrates core AI-powered email automation capabilities with minimal viable features.

### Phase 4: Email Sending (Resend + Tracking)

Required environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (verified sender in Resend)
- `SUPABASE_SERVICE_ROLE_KEY` (for open/click tracking updates)
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` for tracking links)

Database migration:

- Run `lib/supabase/migrations/005_sent_emails.sql` in Supabase SQL Editor.

# IN-PROGRESS# windmill-email
