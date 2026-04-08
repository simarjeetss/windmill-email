import { NextResponse } from "next/server";
import { processCampaignSendJob } from "@/lib/supabase/sent-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INTERNAL_RUNNER_SECRET =
  process.env.EMAIL_SEND_JOB_SECRET ?? process.env.RESEND_WEBHOOK_SECRET ?? null;

function hasValidSecret(req: Request): boolean {
  if (!INTERNAL_RUNNER_SECRET) return false;
  return req.headers.get("x-email-send-secret") === INTERNAL_RUNNER_SECRET;
}

async function continueJob(req: Request, jobId: string) {
  if (!INTERNAL_RUNNER_SECRET) return;

  void fetch(new URL(req.url), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-email-send-secret": INTERNAL_RUNNER_SECRET,
    },
    body: JSON.stringify({ jobId }),
  }).catch(() => {});
}

export async function POST(req: Request) {
  if (!hasValidSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { jobId?: string } | null;
  const jobId = body?.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const result = await processCampaignSendJob(jobId);

  if (result.data?.hasMore) {
    await continueJob(req, jobId);
  }

  return NextResponse.json(
    {
      ok: !result.error,
      job: result.data?.job ?? null,
      hasMore: result.data?.hasMore ?? false,
      counts: result.data
        ? {
            queued: result.data.queued,
            processing: result.data.processing,
            sent: result.data.sent,
            failed: result.data.failed,
            total: result.data.total,
          }
        : null,
      error: result.error,
    },
    { status: result.error ? 500 : 202 }
  );
}
