# Inngest Integration Migration Plan

## Goal
Replace the current synchronous campaign send flow with an Inngest-based async workflow that is safer, observable, and retryable.

## Current state summary
- Old internal background-job implementation has been removed.
- Campaign sending is currently synchronous via `sendCampaignNow`.
- UI currently assumes send completion in a single request.
- No Inngest runtime/config exists yet.

---

## Phase 1: Add Inngest runtime and project configuration

### Files to update
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/package.json`
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/.env.local`
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/README.md`
- New: `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/inngest/client.ts`

### Changes
1. Add `inngest` dependency to `package.json`.
2. Add optional scripts for local workflow dev (example: `inngest:dev`).
3. Add required env vars:
   - `INNGEST_EVENT_KEY`
   - `INNGEST_SIGNING_KEY`
   - `INNGEST_ENV`
4. Create a single shared Inngest client in `lib/inngest/client.ts`.
5. Document local setup + production env requirements in `README.md`.

### Exit criteria
- Inngest package installed and importable.
- Env vars documented and loaded.
- Shared client compiles.

---

## Phase 2: Add async run data model in Supabase

### Files to update
- New: `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/supabase/migrations/011_campaign_send_runs.sql`
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/supabase/migrations/run_all.sql`

### Changes
1. Create `campaign_send_runs` table with columns:
   - `id uuid pk`
   - `user_id uuid`
   - `campaign_id uuid`
   - `status text check (queued, running, completed, failed, cancelled)`
   - `subject text`
   - `body text`
   - `attachment_ids jsonb`
   - `total_count int`
   - `sent_count int`
   - `failed_count int`
   - `last_error text`
   - `created_at`, `updated_at`, optional `started_at`, `completed_at`
2. Add indexes (`user_id`, `campaign_id`, `status`, `created_at desc`).
3. Add RLS policy (`auth.uid() = user_id`) matching existing ownership model.
4. Add optional `run_id` FK on `sent_emails` for per-email linkage.
5. Add partial unique index to prevent multiple active runs per campaign/user:
   - unique on `(user_id, campaign_id)` where status in (`queued`, `running`).
6. Append the migration to `run_all.sql`.

### Exit criteria
- Schema supports enqueue/running/completed lifecycle.
- Active-run duplication is DB-enforced.

---

## Phase 3: Refactor send logic into worker-safe service layer

### Files to update
- New: `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/campaign-send/service.ts`
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/supabase/sent-emails.ts`
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/supabase/admin.ts` (reuse only)

### Changes
1. Move campaign-send business logic out of session-bound server action code.
2. Create pure service functions that accept explicit IDs and payloads:
   - `prepareRun(...)`
   - `claimRunWork(...)` (or fetch pending rows)
   - `sendOneEmail(...)`
   - `finalizeRun(...)`
3. Ensure worker path uses admin client (`createAdminClient`) and not cookie auth.
4. Keep `sent-emails.ts` focused on user-facing server actions + stats.
5. Preserve existing analytics correctness (`sent_emails` + webhook updates).

### Exit criteria
- Send logic can run in both server actions and Inngest handler context.
- No hard dependency on request session inside worker execution path.

---

## Phase 4: Add Inngest functions and serve endpoint

### Files to add/update
- New: `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/inngest/functions/campaign-send.ts`
- New: `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/inngest/functions/index.ts`
- New: `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/app/api/inngest/route.ts`
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/proxy.ts`

### Changes
1. Implement Inngest function(s):
   - Trigger: `campaign/send.requested` event.
   - Steps: load run, process batch/send rows, update counts/status, mark complete.
2. Configure retries and concurrency per function.
3. Configure idempotency key for duplicate enqueue protection.
4. Export all functions from `functions/index.ts`.
5. Expose Next.js route handler via Inngest `serve()` at `/api/inngest`.
6. Ensure middleware/proxy does not block `/api/inngest`.

### Exit criteria
- Inngest can sync functions.
- Events can trigger campaign send flow end-to-end.

---

## Phase 5: Replace synchronous UI contract with async run lifecycle

### Files to update
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/components/campaigns/email-composer.tsx`
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/components/campaigns/campaign-tabs.tsx`
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/app/(dashboard)/dashboard/campaigns/[id]/page.tsx`
- New: `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/components/campaigns/send-run-status.tsx`

### Changes
1. Replace `sendCampaignNow(...)` usage with enqueue action.
2. Stop treating send as immediate completion.
3. Show run lifecycle states: queued/running/completed/failed.
4. Keep composer content after enqueue (do not auto-clear on enqueue).
5. Add retry/requeue controls where appropriate.
6. Load initial run state server-side for the campaign page.

### Exit criteria
- UX reflects async processing model.
- No blocking UI for long sends.

---

## Phase 6: Add server actions for enqueue, progress, and retry

### File to update
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/supabase/sent-emails.ts`

### Changes
Add/replace server actions:
1. `enqueueCampaignSend(campaignId, subject, body, attachmentIds)`
   - validates auth/profile/campaign/contacts
   - creates run row
   - creates pending `sent_emails` rows
   - sends Inngest event
2. `getLatestCampaignSendRun(campaignId)`
   - returns latest run + aggregate counts
3. `retryCampaignSendRun(runId)`
   - checks ownership and run status
   - emits retry event or re-enqueue event

### Exit criteria
- UI can enqueue and poll progress.
- Retry path is user-safe and ownership-checked.

---

## Phase 7: Testing updates

### Files to update/add
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/tests/phase3.test.tsx`
- New: `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/tests/campaign-send.service.test.ts`
- New: `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/tests/inngest-campaign-send.test.ts`

### Changes
1. Update phase3 UI mocks from `sendCampaignNow` to enqueue/progress actions.
2. Add service-layer tests for:
   - idempotency guard behavior
   - status transitions
   - failure handling and count integrity
3. Add Inngest function tests for:
   - event-to-run processing
   - retry behavior
   - run completion/failure updates

### Exit criteria
- Async send lifecycle is covered by tests.
- Regressions in run state logic are caught.

---

## Phase 8: Rollout and safety controls

### Files to update
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/lib/supabase/sent-emails.ts`
- `/Users/simarjeetss529/Desktop/saar/projects/windmill-email/README.md`

### Changes
1. Add feature flag `USE_INNGEST_SEND_PIPELINE`.
2. Keep legacy sync path temporarily as fallback (short-lived).
3. Document rollout sequence:
   - deploy schema
   - deploy code
   - sync Inngest app
   - enable flag
4. Document rollback steps.

### Exit criteria
- Integration can be enabled safely.
- Rollback path is clear and quick.

---

## Suggested commit sequence
1. `chore: add inngest dependency, env docs, shared client`
2. `feat: add campaign_send_runs migration and constraints`
3. `refactor: extract campaign send service layer`
4. `feat: add inngest functions and /api/inngest serve route`
5. `feat: switch composer to async enqueue + run status UI`
6. `feat: add enqueue/progress/retry server actions`
7. `test: update phase3 and add service+inngest tests`
8. `ops: add feature flag and rollout docs`

---

## Definition of done
- Campaign send requests are enqueued via Inngest events.
- Sends process asynchronously with run-level status tracking.
- Duplicate active runs are prevented at DB level.
- UI shows real run lifecycle and progress.
- Webhook analytics flow remains correct.
- Lint/tests pass on final branch.
