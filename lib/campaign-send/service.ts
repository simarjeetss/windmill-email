import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildTrackedEmail } from "@/lib/email/templating";
import { insertEmailEvent } from "@/lib/supabase/email-events";
import {
  getLatestContactStatus,
  getLatestRowsByContact,
  matchesFollowUpSegment,
  resolveFollowUpAudienceContactIds,
  type CampaignRunType,
  type FollowUpAudienceRow,
  type LatestContactStatus,
  type FollowUpSegment,
} from "@/lib/campaign-send/follow-up";
import type { UserProfile } from "@/lib/supabase/profile";

type SendRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type CampaignSendRun = {
  id: string;
  user_id: string;
  campaign_id: string;
  status: SendRunStatus;
  run_type: CampaignRunType;
  follow_up_segment: FollowUpSegment | null;
  subject: string;
  body: string;
  attachment_ids: string[];
  total_count: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ContactRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  campaign_id: string;
  user_id: string;
  created_at: string;
};

type PendingSendRow = {
  id: string;
  contact_id: string;
};

type AttachmentPayload = {
  filename: string;
  content: Buffer;
};

type CreateRunInput = {
  userId: string;
  campaignId: string;
  subject: string;
  body: string;
  attachmentIds: string[];
  runType?: CampaignRunType;
  followUpSegment?: FollowUpSegment | null;
  contactIds?: string[];
};

export type CreateRunResult = {
  run: CampaignSendRun | null;
  error: string | null;
  alreadyActive?: boolean;
};

function formatCreateRunError(message: string, runType: CampaignRunType): string {
  if (
    runType === "followup" &&
    /(run_type|follow_up_segment|schema cache|column .* does not exist)/i.test(message)
  ) {
    return "Follow-up sends are not fully configured in the database yet. Apply the latest Supabase migration, then try again.";
  }

  return message;
}

export type FollowUpAudiencePreviewContact = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  latest_status: LatestContactStatus;
  latest_activity_at: string;
};

export type FollowUpAudienceSummary = Record<FollowUpSegment, FollowUpAudiencePreviewContact[]>;

function emptyFollowUpAudienceSummary(): FollowUpAudienceSummary {
  return {
    failed: [],
    opened: [],
    clicked: [],
    sent_all: [],
    sent_unengaged: [],
    pending: [],
  };
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("id, full_name, company, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as UserProfile) ?? null;
}

async function loadAttachmentsForSendAdmin(
  userId: string,
  attachmentIds: string[]
): Promise<{ data: AttachmentPayload[]; error: string | null }> {
  if (attachmentIds.length === 0) return { data: [], error: null };
  const supabase = createAdminClient();
  const out: AttachmentPayload[] = [];

  for (const id of attachmentIds) {
    const { data: row, error } = await supabase
      .from("email_template_attachments")
      .select("id, file_name, storage_path")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !row) return { data: [], error: "Invalid attachment." };

    const { data: blob, error: dlError } = await supabase.storage
      .from("template-attachments")
      .download(row.storage_path as string);

    if (dlError || !blob) return { data: [], error: dlError?.message ?? "Could not load attachment." };
    out.push({
      filename: row.file_name as string,
      content: Buffer.from(await blob.arrayBuffer()),
    });
  }

  return { data: out, error: null };
}

async function listContactsForRun(input: CreateRunInput): Promise<{ data: ContactRow[]; error: string | null }> {
  const supabase = createAdminClient();
  let query = supabase
    .from("contacts")
    .select("id, email, first_name, last_name, company, campaign_id, user_id, created_at")
    .eq("campaign_id", input.campaignId)
    .eq("user_id", input.userId);

  if (input.contactIds?.length) {
    query = query.in("id", input.contactIds);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as ContactRow[], error: null };
}

async function listCampaignAudienceRows(
  userId: string,
  campaignId: string
): Promise<{ data: FollowUpAudienceRow[]; error: string | null }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sent_emails")
    .select("id, contact_id, status, created_at, sent_at, opened_at, clicked_at")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .not("contact_id", "is", null);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as FollowUpAudienceRow[], error: null };
}

async function resolveRunContactIds(
  input: CreateRunInput
): Promise<{ data: string[] | null; error: string | null }> {
  if (input.contactIds?.length) {
    return { data: Array.from(new Set(input.contactIds.filter(Boolean))), error: null };
  }

  if (input.runType !== "followup") {
    return { data: null, error: null };
  }

  if (!input.followUpSegment) {
    return { data: [], error: "Choose a follow-up segment before queueing this run." };
  }

  const { data: audienceRows, error } = await listCampaignAudienceRows(input.userId, input.campaignId);
  if (error) return { data: [], error };

  const contactIds = resolveFollowUpAudienceContactIds(audienceRows, input.followUpSegment);
  return { data: contactIds, error: null };
}

export async function countFollowUpAudience(
  userId: string,
  campaignId: string,
  segment: FollowUpSegment
): Promise<{ count: number; error: string | null }> {
  const { data, error } = await listCampaignAudienceRows(userId, campaignId);
  if (error) return { count: 0, error };
  return {
    count: resolveFollowUpAudienceContactIds(data, segment).length,
    error: null,
  };
}

export async function getFollowUpAudienceSummary(
  userId: string,
  campaignId: string
): Promise<{ summary: FollowUpAudienceSummary; error: string | null }> {
  const { data: audienceRows, error } = await listCampaignAudienceRows(userId, campaignId);
  if (error) return { summary: emptyFollowUpAudienceSummary(), error };

  const latestRows = getLatestRowsByContact(audienceRows).sort((a, b) =>
    (b.clicked_at ?? b.opened_at ?? b.sent_at ?? b.created_at).localeCompare(
      a.clicked_at ?? a.opened_at ?? a.sent_at ?? a.created_at
    )
  );

  const contactIds = latestRows
    .map((row) => row.contact_id)
    .filter((contactId): contactId is string => Boolean(contactId));

  if (contactIds.length === 0) {
    return { summary: emptyFollowUpAudienceSummary(), error: null };
  }

  const supabase = createAdminClient();
  const { data: contactsData, error: contactsError } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, company")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .in("id", contactIds);

  if (contactsError) {
    return { summary: emptyFollowUpAudienceSummary(), error: contactsError.message };
  }

  const contactsById = new Map(
    ((contactsData ?? []) as Array<Pick<ContactRow, "id" | "email" | "first_name" | "last_name" | "company">>).map(
      (contact) => [contact.id, contact]
    )
  );

  const summary = emptyFollowUpAudienceSummary();

  for (const row of latestRows) {
    if (!row.contact_id) continue;
    const contact = contactsById.get(row.contact_id);
    if (!contact) continue;

    const preview = {
      id: contact.id,
      email: contact.email,
      first_name: contact.first_name,
      last_name: contact.last_name,
      company: contact.company,
      latest_status: getLatestContactStatus(row),
      latest_activity_at: row.clicked_at ?? row.opened_at ?? row.sent_at ?? row.created_at,
    } satisfies FollowUpAudiencePreviewContact;

    if (matchesFollowUpSegment(row, "failed")) summary.failed.push(preview);
    if (matchesFollowUpSegment(row, "opened")) summary.opened.push(preview);
    if (matchesFollowUpSegment(row, "clicked")) summary.clicked.push(preview);
    if (matchesFollowUpSegment(row, "sent_all")) summary.sent_all.push(preview);
    if (matchesFollowUpSegment(row, "sent_unengaged")) summary.sent_unengaged.push(preview);
    if (matchesFollowUpSegment(row, "pending")) summary.pending.push(preview);
  }

  return { summary, error: null };
}

export async function previewFollowUpAudience(
  userId: string,
  campaignId: string,
  segment: FollowUpSegment
): Promise<{ contacts: FollowUpAudiencePreviewContact[]; error: string | null }> {
  const { summary, error } = await getFollowUpAudienceSummary(userId, campaignId);
  return { contacts: summary[segment], error };
}

async function recalcRunCounts(runId: string): Promise<{ sent: number; failed: number; pending: number }> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sent_emails").select("status").eq("run_id", runId);
  const sent = (data ?? []).filter((r) => r.status === "sent").length;
  const failed = (data ?? []).filter((r) => r.status === "failed").length;
  const pending = (data ?? []).filter((r) => r.status === "pending").length;
  return { sent, failed, pending };
}

export async function createCampaignSendRun(input: CreateRunInput): Promise<CreateRunResult> {
  const trimmedSubject = input.subject.trim();
  const trimmedBody = input.body.trim();
  const runType = input.runType ?? "initial";
  const followUpSegment = runType === "followup" ? input.followUpSegment ?? null : null;

  if (!trimmedSubject) return { run: null, error: "Subject is required." };
  if (!trimmedBody) return { run: null, error: "Body is required." };

  if (!process.env.RESEND_API_KEY) return { run: null, error: "Missing RESEND_API_KEY." };
  if (!process.env.RESEND_FROM_EMAIL) return { run: null, error: "Missing RESEND_FROM_EMAIL." };

  const profile = await getUserProfile(input.userId);
  if (!profile?.full_name) {
    return { run: null, error: "Please set your sender profile first." };
  }

  const supabase = createAdminClient();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", input.campaignId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (campaignError || !campaign) {
    return { run: null, error: campaignError?.message ?? "Campaign not found." };
  }

  const { data: resolvedContactIds, error: resolveContactsError } = await resolveRunContactIds({
    ...input,
    runType,
    followUpSegment,
  });
  if (resolveContactsError) return { run: null, error: resolveContactsError };

  const { data: contacts, error: contactsError } = await listContactsForRun({
    ...input,
    runType,
    followUpSegment,
    contactIds: resolvedContactIds ?? input.contactIds,
  });
  if (contactsError) return { run: null, error: contactsError };
  if (contacts.length === 0) {
    return {
      run: null,
      error:
        runType === "followup"
          ? "No contacts match the selected follow-up segment."
          : "No contacts to send to.",
    };
  }

  const dedupedAttachmentIds = Array.from(new Set(input.attachmentIds.filter(Boolean)));
  const { error: attachmentError } = await loadAttachmentsForSendAdmin(input.userId, dedupedAttachmentIds);
  if (attachmentError) return { run: null, error: attachmentError };

  const { data: run, error: runInsertError } = await supabase
    .from("campaign_send_runs")
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId,
      status: "queued",
      run_type: runType,
      follow_up_segment: followUpSegment,
      subject: trimmedSubject,
      body: trimmedBody,
      attachment_ids: dedupedAttachmentIds,
      total_count: contacts.length,
      sent_count: 0,
      failed_count: 0,
    })
    .select("*")
    .single();

  if (runInsertError) {
    if ((runInsertError as { code?: string }).code === "23505") {
      const { data: existing } = await supabase
        .from("campaign_send_runs")
        .select("*")
        .eq("user_id", input.userId)
        .eq("campaign_id", input.campaignId)
        .in("status", ["queued", "running"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { run: (existing as CampaignSendRun | null) ?? null, error: "Campaign send already in progress.", alreadyActive: true };
    }
    return { run: null, error: formatCreateRunError(runInsertError.message, runType) };
  }

  const { error: rowsError } = await supabase.from("sent_emails").insert(
    contacts.map((c) => ({
      user_id: input.userId,
      campaign_id: input.campaignId,
      contact_id: c.id,
      run_id: run.id,
      subject: trimmedSubject,
      body: trimmedBody,
      status: "pending",
    }))
  );

  if (rowsError) {
    await supabase
      .from("campaign_send_runs")
      .update({
        status: "failed",
        last_error: rowsError.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return { run: null, error: rowsError.message };
  }

  return { run: run as CampaignSendRun, error: null };
}

export async function getLatestCampaignRun(userId: string, campaignId: string): Promise<CampaignSendRun | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("campaign_send_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CampaignSendRun) ?? null;
}

export async function processCampaignSendRun(runId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: runData, error: runError } = await supabase
    .from("campaign_send_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (runError || !runData) throw new Error(runError?.message ?? "Run not found.");

  const run = runData as CampaignSendRun;
  if (run.status === "completed" || run.status === "cancelled") return;

  if (run.status !== "running") {
    await supabase
      .from("campaign_send_runs")
      .update({
        status: "running",
        started_at: run.started_at ?? new Date().toISOString(),
        last_error: null,
      })
      .eq("id", run.id);
  }

  const { data: pendingRows, error: pendingError } = await supabase
    .from("sent_emails")
    .select("id, contact_id")
    .eq("run_id", run.id)
    .eq("status", "pending");

  if (pendingError) {
    throw new Error(pendingError.message);
  }

  const pending = (pendingRows ?? []) as PendingSendRow[];
  if (pending.length === 0) {
    await supabase
      .from("campaign_send_runs")
      .update({
        status: "completed",
        completed_at: run.completed_at ?? new Date().toISOString(),
      })
      .eq("id", run.id);
    return;
  }

  const { data: contactsData, error: contactsError } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, company, campaign_id, user_id, created_at")
    .in("id", pending.map((p) => p.contact_id))
    .eq("user_id", run.user_id);
  if (contactsError) throw new Error(contactsError.message);

  const contacts = (contactsData ?? []) as ContactRow[];
  const profile = await getUserProfile(run.user_id);
  if (!profile?.full_name) {
    throw new Error("Missing sender profile.");
  }

  const attachmentIds = Array.isArray(run.attachment_ids) ? run.attachment_ids : [];
  const { data: resendAttachments, error: attachmentError } = await loadAttachmentsForSendAdmin(
    run.user_id,
    attachmentIds
  );
  if (attachmentError) throw new Error(attachmentError);

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const fromEmail = process.env.RESEND_FROM_EMAIL!;
  const baseUrl = getBaseUrl();
  let sentCount = run.sent_count;
  let failedCount = run.failed_count;

  for (const row of pending) {
    const { data: liveRun } = await supabase
      .from("campaign_send_runs")
      .select("status")
      .eq("id", run.id)
      .maybeSingle();
    if (liveRun?.status === "cancelled") {
      break;
    }

    const contact = contacts.find((c) => c.id === row.contact_id) ?? null;
    if (!contact) {
      await supabase
        .from("sent_emails")
        .update({ status: "failed", error: "Contact not found." })
        .eq("id", row.id);
      failedCount += 1;
      await supabase
        .from("campaign_send_runs")
        .update({
          status: "running",
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq("id", run.id);
      continue;
    }

    const tracked = buildTrackedEmail({
      subject: run.subject,
      body: run.body,
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
      tags: [
        { name: "sent_email_id", value: row.id },
        { name: "campaign_send_run_id", value: run.id },
      ],
      attachments:
        resendAttachments.length > 0
          ? resendAttachments.map((a) => ({
              filename: a.filename,
              content: a.content.toString("base64"),
            }))
          : undefined,
    });

    if (error) {
      await supabase
        .from("sent_emails")
        .update({ status: "failed", error: error.message })
        .eq("id", row.id);
      failedCount += 1;
      await supabase
        .from("campaign_send_runs")
        .update({
          status: "running",
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq("id", run.id);
      continue;
    }

    const sentAt = new Date().toISOString();
    await supabase
      .from("sent_emails")
      .update({
        status: "sent",
        resend_id: data?.id ?? null,
        sent_at: sentAt,
        subject: tracked.subject,
        body: tracked.text,
      })
      .eq("id", row.id);

    await insertEmailEvent({
      sentEmailId: row.id,
      eventType: "sent",
      eventSource: "system",
      occurredAt: sentAt,
      providerMessageId: data?.id ?? null,
      confidence: 1,
    });
    sentCount += 1;
    await supabase
      .from("campaign_send_runs")
      .update({
        status: "running",
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", run.id);
  }

  const { sent, failed, pending: stillPending } = await recalcRunCounts(run.id);
  const { data: latestRun } = await supabase
    .from("campaign_send_runs")
    .select("status")
    .eq("id", run.id)
    .maybeSingle();
  if (latestRun?.status === "cancelled") {
    return;
  }
  const done = stillPending === 0;
  await supabase
    .from("campaign_send_runs")
    .update({
      sent_count: sent,
      failed_count: failed,
      status: done ? "completed" : "running",
      completed_at: done ? new Date().toISOString() : null,
      last_error: null,
    })
    .eq("id", run.id);

  await supabase
    .from("campaigns")
    .update({ status: "active" })
    .eq("id", run.campaign_id)
    .eq("user_id", run.user_id)
    .eq("status", "draft");
}

export async function markRunFailed(runId: string, errorMessage: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("campaign_send_runs")
    .update({
      status: "failed",
      last_error: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

export async function retryFailedCampaignSendRun(runId: string, userId: string): Promise<CreateRunResult> {
  const supabase = createAdminClient();
  const { data: runData, error: runError } = await supabase
    .from("campaign_send_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (runError || !runData) return { run: null, error: "Run not found." };
  const run = runData as CampaignSendRun;
  if (!["completed", "failed"].includes(run.status)) {
    return { run: null, error: "Only completed or failed runs can be retried." };
  }

  const { data: failedRows, error: failedError } = await supabase
    .from("sent_emails")
    .select("contact_id")
    .eq("run_id", run.id)
    .eq("status", "failed");

  if (failedError) return { run: null, error: failedError.message };
  const failedContactIds = (failedRows ?? []).map((r) => r.contact_id as string);
  if (failedContactIds.length === 0) {
    return { run: null, error: "No failed emails to retry." };
  }

  return createCampaignSendRun({
    userId,
    campaignId: run.campaign_id,
    subject: run.subject,
    body: run.body,
    attachmentIds: run.attachment_ids ?? [],
    runType: "retry",
    contactIds: failedContactIds,
  });
}

export async function cancelCampaignSendRun(
  runId: string,
  userId: string
): Promise<{ run: CampaignSendRun | null; error: string | null }> {
  const supabase = createAdminClient();
  const { data: runData, error: runError } = await supabase
    .from("campaign_send_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (runError || !runData) {
    return { run: null, error: "Run not found." };
  }

  const run = runData as CampaignSendRun;
  if (!["queued", "running"].includes(run.status)) {
    return { run, error: "Only queued or running runs can be cancelled." };
  }

  await supabase
    .from("sent_emails")
    .update({
      status: "failed",
      error: "Cancelled by user.",
    })
    .eq("run_id", run.id)
    .eq("status", "pending");

  const { data: updated, error: updateError } = await supabase
    .from("campaign_send_runs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      last_error: "Cancelled by user.",
    })
    .eq("id", run.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError) {
    return { run: null, error: updateError.message };
  }

  const counts = await recalcRunCounts(run.id);
  const { data: counted, error: countUpdateError } = await supabase
    .from("campaign_send_runs")
    .update({
      sent_count: counts.sent,
      failed_count: counts.failed,
    })
    .eq("id", run.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (countUpdateError) {
    return { run: updated as CampaignSendRun, error: null };
  }

  return { run: counted as CampaignSendRun, error: null };
}
