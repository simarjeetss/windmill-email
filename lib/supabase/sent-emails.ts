"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { buildTrackedEmail } from "@/lib/email/templating";
import { calculateCampaignStats, parseEventStats } from "@/lib/analytics/metrics";
import { loadAttachmentsForSend } from "@/lib/supabase/template-attachments";
import type { Contact } from "@/lib/supabase/campaigns";
import type { UserProfile } from "@/lib/supabase/profile";

export type SendCampaignResult = {
  sent: number;
  failed: number;
  error: string | null;
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

export async function sendCampaignNow(
  campaignId: string,
  subject: string,
  body: string,
  attachmentIds?: string[]
): Promise<SendCampaignResult> {
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
