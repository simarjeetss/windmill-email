"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildTrackedEmail } from "@/lib/email/templating";
import { calculateCampaignStats, parseEventStats } from "@/lib/analytics/metrics";
import { loadAttachmentsForSend } from "@/lib/supabase/template-attachments";
import type { Contact } from "@/lib/supabase/campaigns";
import type { UserProfile } from "@/lib/supabase/profile";

const SEND_BATCH_SIZE = 20;
const SEND_CONCURRENCY = 4;
const PROCESSING_STALE_MS = 10 * 60 * 1000;
const JOB_MAX_RUNTIME_MS = 20 * 1000;
const INTERNAL_RUNNER_PATH = "/api/internal/email-send-jobs";
const INTERNAL_RUNNER_SECRET =
  process.env.EMAIL_SEND_JOB_SECRET ?? process.env.RESEND_WEBHOOK_SECRET ?? null;

export type CampaignSendJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type EnqueueCampaignResult = {
  jobId: string | null;
  queued: number;
  error: string | null;
};

export type CampaignSendJob = {
  id: string;
  user_id: string;
  campaign_id: string;
  subject: string;
  body: string;
  attachment_ids: string[];
  status: CampaignSendJobStatus;
  total_count: number;
  sent_count: number;
  failed_count: number;
  claimed_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignSendJobProgress = {
  job: CampaignSendJob;
  queued: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
  hasMore: boolean;
};

export type CampaignStats = {
  sent: number;
  delivered: number;
  opened: number;
  openedRaw: number;
  clicked: number;
  openRate: string;
  openRateRaw: string;
  clickRate: string;
  clickToOpenRate: string;
};

type SentEmailStatus = "pending" | "queued" | "processing" | "sent" | "failed";

type SentEmailClaimRow = {
  id: string;
  user_id: string;
  campaign_id: string;
  contact_id: string;
  subject: string;
  body: string;
  status: SentEmailStatus;
  resend_id: string | null;
  error: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  delivered_at?: string | null;
  created_at: string;
  updated_at: string;
  send_job_id: string | null;
};

type CampaignSendJobRow = Omit<CampaignSendJob, "attachment_ids" | "status"> & {
  attachment_ids: unknown;
  status: string;
};

function normalizeAttachmentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

function mapCampaignSendJob(row: CampaignSendJobRow): CampaignSendJob {
  return {
    ...row,
    attachment_ids: normalizeAttachmentIds(row.attachment_ids),
    status: row.status as CampaignSendJobStatus,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

async function getProfileByUserId(userId: string): Promise<UserProfile | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("id, full_name, company, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as UserProfile) ?? null;
}

async function getProfileForCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getProfileByUserId(user.id);
}

async function getJobRow(jobId: string): Promise<CampaignSendJob | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("email_send_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error || !data) return null;
  return mapCampaignSendJob(data as CampaignSendJobRow);
}

async function countJobRows(jobId: string): Promise<{
  queued: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
}> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("sent_emails").select("status").eq("send_job_id", jobId);
  if (error || !data) return { queued: 0, processing: 0, sent: 0, failed: 0, total: 0 };

  return data.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.status === "queued") acc.queued += 1;
      else if (row.status === "processing") acc.processing += 1;
      else if (row.status === "sent") acc.sent += 1;
      else if (row.status === "failed") acc.failed += 1;
      return acc;
    },
    { queued: 0, processing: 0, sent: 0, failed: 0, total: 0 }
  );
}

async function syncJobProgress(jobId: string, lastError?: string | null): Promise<CampaignSendJobProgress | null> {
  const supabase = createAdminClient();
  const job = await getJobRow(jobId);
  if (!job) return null;

  const counts = await countJobRows(jobId);
  const hasMore = counts.queued > 0 || counts.processing > 0;
  const nextStatus: CampaignSendJobStatus = hasMore
    ? "running"
    : counts.sent === 0 && counts.failed > 0
    ? "failed"
    : "completed";

  const { data, error } = await supabase
    .from("email_send_jobs")
    .update({
      status: nextStatus,
      sent_count: counts.sent,
      failed_count: counts.failed,
      claimed_at: hasMore ? new Date().toISOString() : job.claimed_at,
      completed_at: hasMore ? null : new Date().toISOString(),
      last_error: lastError ?? job.last_error,
    })
    .eq("id", jobId)
    .select("*")
    .single();

  const nextJob = error || !data ? job : mapCampaignSendJob(data as CampaignSendJobRow);
  return {
    job: nextJob,
    ...counts,
    hasMore,
  };
}

async function markUnfinishedRowsFailed(jobId: string, error: string) {
  const supabase = createAdminClient();
  await supabase
    .from("sent_emails")
    .update({ status: "failed", error })
    .eq("send_job_id", jobId)
    .in("status", ["queued", "processing"]);
}

async function claimEmailSendBatch(jobId: string): Promise<SentEmailClaimRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("claim_email_send_batch", {
    p_job_id: jobId,
    p_batch_size: SEND_BATCH_SIZE,
    p_stale_before: new Date(Date.now() - PROCESSING_STALE_MS).toISOString(),
  });

  if (error || !data) return [];
  return data as SentEmailClaimRow[];
}

async function getContactsForRows(userId: string, rows: SentEmailClaimRow[]): Promise<Map<string, Contact>> {
  const contactIds = Array.from(new Set(rows.map((row) => row.contact_id).filter(Boolean)));
  if (contactIds.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, company, campaign_id, user_id, created_at")
    .eq("user_id", userId)
    .in("id", contactIds);

  return new Map((data as Contact[] | null | undefined)?.map((contact) => [contact.id, contact]) ?? []);
}

async function sendClaimedRow(args: {
  row: SentEmailClaimRow;
  contacts: Map<string, Contact>;
  resend: Resend;
  fromEmail: string;
  baseUrl: string;
  profile: UserProfile;
  attachments: Awaited<ReturnType<typeof loadAttachmentsForSend>>["data"];
}) {
  const { row, contacts, resend, fromEmail, baseUrl, profile, attachments } = args;
  const supabase = createAdminClient();
  const contact = contacts.get(row.contact_id) ?? null;

  if (!contact?.email) {
    await supabase
      .from("sent_emails")
      .update({ status: "failed", error: "Contact email missing." })
      .eq("id", row.id);
    return;
  }

  const tracked = buildTrackedEmail({
    subject: row.subject,
    body: row.body,
    contact,
    profile,
    sentEmailId: row.id,
    baseUrl,
  });

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: contact.email,
    subject: tracked.subject,
    html: tracked.html,
    text: tracked.text,
    tags: [{ name: "sent_email_id", value: row.id }],
    attachments:
      attachments.length > 0
        ? attachments.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content.toString("base64"),
          }))
        : undefined,
  });

  if (error) {
    await supabase
      .from("sent_emails")
      .update({ status: "failed", error: error.message })
      .eq("id", row.id);
    return;
  }

  await supabase
    .from("sent_emails")
    .update({
      status: "sent",
      resend_id: data?.id ?? null,
      sent_at: new Date().toISOString(),
      subject: tracked.subject,
      body: tracked.text,
      error: null,
    })
    .eq("id", row.id);
}

async function processClaimedBatch(args: {
  job: CampaignSendJob;
  rows: SentEmailClaimRow[];
  resend: Resend;
  fromEmail: string;
  baseUrl: string;
  profile: UserProfile;
  attachments: Awaited<ReturnType<typeof loadAttachmentsForSend>>["data"];
}) {
  const contacts = await getContactsForRows(args.job.user_id, args.rows);
  for (const group of chunk(args.rows, SEND_CONCURRENCY)) {
    await Promise.allSettled(
      group.map((row) =>
        sendClaimedRow({
          row,
          contacts,
          resend: args.resend,
          fromEmail: args.fromEmail,
          baseUrl: args.baseUrl,
          profile: args.profile,
          attachments: args.attachments,
        })
      )
    );
  }
}

async function triggerCampaignSendJob(jobId: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  if (!baseUrl || !INTERNAL_RUNNER_SECRET) return false;

  void fetch(`${baseUrl}${INTERNAL_RUNNER_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-email-send-secret": INTERNAL_RUNNER_SECRET,
    },
    body: JSON.stringify({ jobId }),
  }).catch(() => {});

  return true;
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sent_emails")
    .select("status, opened_at, clicked_at, delivered_at, campaign_id, contact_id, id, sent_at, created_at")
    .eq("campaign_id", campaignId);

  if (error || !data || data.length === 0) {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      openedRaw: 0,
      clicked: 0,
      openRate: "—",
      openRateRaw: "—",
      clickRate: "—",
      clickToOpenRate: "—",
    };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("email_event_stats", {
    p_since: new Date(0).toISOString(),
    p_campaign_id: campaignId,
  });
  const eventStats = !rpcError ? parseEventStats(rpcData) : null;
  const summary = calculateCampaignStats(data, eventStats);

  return {
    sent: summary.sent,
    delivered: summary.delivered,
    opened: summary.opened,
    openedRaw: summary.openedRaw,
    clicked: summary.clicked,
    openRate: summary.openRate,
    openRateRaw: summary.openRateRaw,
    clickRate: summary.clickRate,
    clickToOpenRate: summary.clickToOpenRate,
  };
}

export async function enqueueCampaignSend(
  campaignId: string,
  subject: string,
  body: string,
  attachmentIds?: string[]
): Promise<EnqueueCampaignResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { jobId: null, queued: 0, error: "Not authenticated" };

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject) return { jobId: null, queued: 0, error: "Subject is required." };
  if (!trimmedBody) return { jobId: null, queued: 0, error: "Body is required." };

  const ids = attachmentIds?.filter(Boolean) ?? [];
  const profile = await getProfileForCurrentUser();
  if (!profile?.full_name) return { jobId: null, queued: 0, error: "Please set your sender profile first." };

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (campaignError || !campaign) {
    return { jobId: null, queued: 0, error: campaignError?.message ?? "Campaign not found." };
  }

  const { data: existingJob } = await supabase
    .from("email_send_jobs")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle();

  if (existingJob) {
    return { jobId: existingJob.id, queued: 0, error: "A campaign send is already running." };
  }

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, company, campaign_id, user_id, created_at")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id);

  if (contactsError) return { jobId: null, queued: 0, error: contactsError.message };
  if (!contacts || contacts.length === 0) return { jobId: null, queued: 0, error: "No contacts to send to." };

  const { data: jobData, error: jobError } = await supabase
    .from("email_send_jobs")
    .insert({
      user_id: user.id,
      campaign_id: campaignId,
      subject: trimmedSubject,
      body: trimmedBody,
      attachment_ids: ids,
      status: "queued",
      total_count: contacts.length,
      sent_count: 0,
      failed_count: 0,
    })
    .select("*")
    .single();

  if (jobError || !jobData) {
    return { jobId: null, queued: 0, error: jobError?.message ?? "Could not create send job." };
  }

  const job = mapCampaignSendJob(jobData as CampaignSendJobRow);

  const { error: insertError } = await supabase.from("sent_emails").insert(
    contacts.map((contact) => ({
      user_id: user.id,
      campaign_id: campaignId,
      send_job_id: job.id,
      contact_id: contact.id,
      subject: trimmedSubject,
      body: trimmedBody,
      status: "queued",
    }))
  );

  if (insertError) {
    await supabase.from("email_send_jobs").delete().eq("id", job.id).eq("user_id", user.id);
    return { jobId: null, queued: 0, error: insertError.message };
  }

  if (campaign.status === "draft") {
    await supabase
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaignId)
      .eq("user_id", user.id);
  }

  await syncJobProgress(job.id);
  await triggerCampaignSendJob(job.id);

  return { jobId: job.id, queued: contacts.length, error: null };
}

export async function getLatestCampaignSendJob(
  campaignId: string
): Promise<{ data: CampaignSendJobProgress | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("email_send_jobs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  const job = mapCampaignSendJob(data as CampaignSendJobRow);
  const counts = await countJobRows(job.id);

  return {
    data: {
      job,
      ...counts,
      hasMore: counts.queued > 0 || counts.processing > 0,
    },
    error: null,
  };
}

export async function kickCampaignSendJob(jobId: string): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("email_send_jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Send job not found." };
  const ok = await triggerCampaignSendJob(jobId);
  return { ok, error: ok ? null : "Could not trigger send worker." };
}

export async function processCampaignSendJob(
  jobId: string,
  options?: { maxRuntimeMs?: number }
): Promise<{ data: CampaignSendJobProgress | null; error: string | null }> {
  const supabase = createAdminClient();
  const job = await getJobRow(jobId);
  if (!job) return { data: null, error: "Send job not found." };
  if (job.status === "completed" || job.status === "cancelled") {
    const progress = await syncJobProgress(jobId);
    return { data: progress, error: null };
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resendKey) {
    const error = "Missing RESEND_API_KEY.";
    await markUnfinishedRowsFailed(jobId, error);
    const progress = await syncJobProgress(jobId, error);
    return { data: progress, error };
  }
  if (!fromEmail) {
    const error = "Missing RESEND_FROM_EMAIL.";
    await markUnfinishedRowsFailed(jobId, error);
    const progress = await syncJobProgress(jobId, error);
    return { data: progress, error };
  }

  const profile = await getProfileByUserId(job.user_id);
  if (!profile?.full_name) {
    const error = "Sender profile is missing.";
    await markUnfinishedRowsFailed(jobId, error);
    const progress = await syncJobProgress(jobId, error);
    return { data: progress, error };
  }

  const { data: attachments, error: attachmentError } = await loadAttachmentsForSend(
    job.attachment_ids,
    job.user_id
  );
  if (attachmentError) {
    await markUnfinishedRowsFailed(jobId, attachmentError);
    const progress = await syncJobProgress(jobId, attachmentError);
    return { data: progress, error: attachmentError };
  }

  await supabase
    .from("email_send_jobs")
    .update({
      status: "running",
      claimed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", jobId);

  const resend = new Resend(resendKey);
  const baseUrl = getBaseUrl();
  const startedAt = Date.now();
  const runtimeBudget = options?.maxRuntimeMs ?? JOB_MAX_RUNTIME_MS;

  while (Date.now() - startedAt < runtimeBudget) {
    const claimedRows = await claimEmailSendBatch(jobId);
    if (claimedRows.length === 0) break;

    await processClaimedBatch({
      job,
      rows: claimedRows,
      resend,
      fromEmail,
      baseUrl,
      profile,
      attachments,
    });

    await syncJobProgress(jobId);
  }

  const progress = await syncJobProgress(jobId);
  return { data: progress, error: null };
}
