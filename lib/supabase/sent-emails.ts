"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { buildTrackedEmail } from "@/lib/email/templating";
import { calculateCampaignStats, parseEventStats } from "@/lib/analytics/metrics";
import { loadAttachmentsForSend } from "@/lib/supabase/template-attachments";
import { inngest } from "@/lib/inngest/client";
import {
  cancelCampaignSendRun as cancelCampaignSendRunService,
  countFollowUpAudience,
  createCampaignSendRun,
  getFollowUpAudienceSummary,
  getLatestCampaignRun,
  previewFollowUpAudience,
  retryFailedCampaignSendRun,
  type CampaignSendRun,
  type FollowUpAudiencePreviewContact,
  type FollowUpAudienceSummary,
} from "@/lib/campaign-send/service";
import type { FollowUpSegment } from "@/lib/campaign-send/follow-up";
import type { Contact } from "@/lib/supabase/campaigns";
import type { UserProfile } from "@/lib/supabase/profile";

export type SendCampaignResult = {
  sent: number;
  failed: number;
  error: string | null;
};

export type EnqueueCampaignSendResult = {
  run: CampaignSendRun | null;
  error: string | null;
};

export type EnqueueCampaignSendOptions = {
  mode?: "initial" | "followup";
  followUpSegment?: FollowUpSegment | null;
};

function formatQueueSendError(message: string, options?: EnqueueCampaignSendOptions): string {
  if (
    options?.mode === "followup" &&
    /(run_type|follow_up_segment|schema cache|column .* does not exist)/i.test(message)
  ) {
    return "Follow-up sends need the latest database migration before they can be queued.";
  }

  return message;
}

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

function shouldUseInngestPipeline(): boolean {
  return process.env.USE_INNGEST_SEND_PIPELINE === "true";
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

async function getProfileForUser(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_profiles")
    .select("id, full_name, company, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();
  return (data as UserProfile) ?? null;
}

export async function enqueueCampaignSend(
  campaignId: string,
  subject: string,
  body: string,
  attachmentIds?: string[],
  options?: EnqueueCampaignSendOptions
): Promise<EnqueueCampaignSendResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { run: null, error: "Not authenticated" };

    const result = await createCampaignSendRun({
      userId: user.id,
      campaignId,
      subject,
      body,
      attachmentIds: attachmentIds ?? [],
      runType: options?.mode === "followup" ? "followup" : "initial",
      followUpSegment: options?.mode === "followup" ? options.followUpSegment ?? null : null,
    });

    if (result.error || !result.run) {
      return {
        run: result.run,
        error: formatQueueSendError(result.error ?? "Could not enqueue campaign.", options),
      };
    }

    try {
      await inngest.send({
        id: result.run.id,
        name: "campaign/send.requested",
        data: {
          runId: result.run.id,
          userId: result.run.user_id,
          campaignId: result.run.campaign_id,
        },
      });
    } catch (inngestError) {
      // The run row was already inserted. Mark it failed so it doesn't
      // block future sends with a "Campaign send already in progress" error.
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        await admin
          .from("campaign_send_runs")
          .update({
            status: "failed",
            last_error: inngestError instanceof Error ? inngestError.message : "Failed to dispatch send event.",
            completed_at: new Date().toISOString(),
          })
          .eq("id", result.run.id);
      } catch {
        // best-effort cleanup — ignore secondary errors
      }
      return {
        run: null,
        error: inngestError instanceof Error ? inngestError.message : "Failed to dispatch campaign send event.",
      };
    }

    return { run: result.run, error: null };
  } catch (error) {
    return {
      run: null,
      error: formatQueueSendError(
        error instanceof Error ? error.message : "Failed to queue campaign send.",
        options
      ),
    };
  }
}

export async function getFollowUpAudienceCount(
  campaignId: string,
  followUpSegment: FollowUpSegment
): Promise<{ count: number; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, error: "Not authenticated" };

  return countFollowUpAudience(user.id, campaignId, followUpSegment);
}

export async function getFollowUpAudiencePreview(
  campaignId: string,
  followUpSegment: FollowUpSegment
): Promise<{ contacts: FollowUpAudiencePreviewContact[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { contacts: [], error: "Not authenticated" };

  return previewFollowUpAudience(user.id, campaignId, followUpSegment);
}

export async function getCampaignFollowUpAudienceSummary(
  campaignId: string
): Promise<{ summary: FollowUpAudienceSummary; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      summary: {
        failed: [],
        opened: [],
        clicked: [],
        sent_all: [],
        sent_unengaged: [],
        pending: [],
      },
      error: "Not authenticated",
    };
  }

  return getFollowUpAudienceSummary(user.id, campaignId);
}

export async function getLatestCampaignSendRun(campaignId: string): Promise<CampaignSendRun | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getLatestCampaignRun(user.id, campaignId);
}

export async function retryCampaignSendRun(runId: string): Promise<EnqueueCampaignSendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { run: null, error: "Not authenticated" };

  const retry = await retryFailedCampaignSendRun(runId, user.id);
  if (retry.error || !retry.run) {
    return { run: retry.run, error: retry.error ?? "Retry could not be started." };
  }

  try {
    await inngest.send({
      id: retry.run.id,
      name: "campaign/send.requested",
      data: {
        runId: retry.run.id,
        userId: retry.run.user_id,
        campaignId: retry.run.campaign_id,
      },
    });
  } catch (error) {
    return {
      run: retry.run,
      error: error instanceof Error ? error.message : "Failed to dispatch retry event.",
    };
  }

  return { run: retry.run, error: null };
}

export async function cancelCampaignSendRun(runId: string): Promise<EnqueueCampaignSendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { run: null, error: "Not authenticated" };
  return cancelCampaignSendRunService(runId, user.id);
}

export async function sendCampaignNow(
  campaignId: string,
  subject: string,
  body: string,
  attachmentIds?: string[]
): Promise<SendCampaignResult> {
  if (shouldUseInngestPipeline()) {
    const queued = await enqueueCampaignSend(campaignId, subject, body, attachmentIds);
    return {
      sent: 0,
      failed: 0,
      error: queued.error,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sent: 0, failed: 0, error: "Not authenticated" };

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject) return { sent: 0, failed: 0, error: "Subject is required." };
  if (!trimmedBody) return { sent: 0, failed: 0, error: "Body is required." };

  const ids = attachmentIds?.filter(Boolean) ?? [];
  const { data: resendAttachments, error: attLoadError } = await loadAttachmentsForSend(ids, user.id);
  if (attLoadError) return { sent: 0, failed: 0, error: attLoadError };

  const profile = await getProfileForUser();
  if (!profile?.full_name) return { sent: 0, failed: 0, error: "Please set your sender profile first." };

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (campaignError || !campaign) {
    return { sent: 0, failed: 0, error: campaignError?.message ?? "Campaign not found." };
  }

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, company, campaign_id, user_id, created_at")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id);

  if (contactsError) return { sent: 0, failed: 0, error: contactsError.message };
  if (!contacts || contacts.length === 0) return { sent: 0, failed: 0, error: "No contacts to send to." };

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resendKey) return { sent: 0, failed: 0, error: "Missing RESEND_API_KEY." };
  if (!fromEmail) return { sent: 0, failed: 0, error: "Missing RESEND_FROM_EMAIL." };

  const resend = new Resend(resendKey);
  const baseUrl = getBaseUrl();

  const { data: sentRows, error: insertError } = await supabase
    .from("sent_emails")
    .insert(
      contacts.map((c) => ({
        user_id: user.id,
        campaign_id: campaignId,
        contact_id: c.id,
        subject: trimmedSubject,
        body: trimmedBody,
        status: "pending",
      }))
    )
    .select("id, contact_id");

  if (insertError) return { sent: 0, failed: 0, error: insertError.message };

  let sent = 0;
  let failed = 0;

  for (const row of sentRows ?? []) {
    const contact = (contacts as Contact[]).find((c) => c.id === row.contact_id) ?? null;
    const tracked = buildTrackedEmail({
      subject: trimmedSubject,
      body: trimmedBody,
      contact,
      profile,
      sentEmailId: row.id,
      baseUrl,
    });

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: contact?.email ?? "",
      subject: tracked.subject,
      html: tracked.html,
      text: tracked.text,
      tags: [{ name: "sent_email_id", value: row.id }],
      // Resend's HTTP client JSON-stringifies the body; Buffer becomes { type, data } which the API rejects.
      // The API expects attachment content as a Base64 string (see Resend send-email docs).
      attachments:
        resendAttachments.length > 0
          ? resendAttachments.map((a) => ({
              filename: a.filename,
              content: a.content.toString("base64"),
            }))
          : undefined,
    });

    if (error) {
      failed += 1;
      await supabase
        .from("sent_emails")
        .update({ status: "failed", error: error.message })
        .eq("id", row.id);
      continue;
    }

    sent += 1;
    await supabase
      .from("sent_emails")
      .update({
        status: "sent",
        resend_id: data?.id ?? null,
        sent_at: new Date().toISOString(),
        subject: tracked.subject,
        body: tracked.text,
      })
      .eq("id", row.id);
  }

  if (campaign.status === "draft") {
    await supabase
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaignId)
      .eq("user_id", user.id);
  }

  return { sent, failed, error: failed === contacts.length ? "All sends failed." : null };
}
