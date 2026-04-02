import { createAdminClient } from "@/lib/supabase/admin";

export type EmailEventType =
  | "sent"
  | "delivered"
  | "open"
  | "click"
  | "bounce"
  | "complaint"
  | "deferred";

export type EmailEventSource = "track_pixel" | "track_click" | "resend_webhook" | "system";

export type InsertEmailEventParams = {
  sentEmailId: string;
  eventType: EmailEventType;
  eventSource: EmailEventSource;
  occurredAt?: string;
  url?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  providerMessageId?: string | null;
  providerEventId?: string | null;
  rawPayload?: Record<string, unknown> | null;
  isSuspectedBot?: boolean;
  confidence?: number;
};

/**
 * Insert an analytics event (server-side, service role). Returns false if sent_email row missing.
 */
export async function insertEmailEvent(params: InsertEmailEventParams): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("sent_emails")
    .select("id, user_id, campaign_id, contact_id")
    .eq("id", params.sentEmailId)
    .maybeSingle();

  if (fetchError || !row) return false;

  const { error } = await supabase.from("email_events").insert({
    sent_email_id: row.id,
    user_id: row.user_id,
    campaign_id: row.campaign_id,
    contact_id: row.contact_id,
    event_type: params.eventType,
    event_source: params.eventSource,
    occurred_at: params.occurredAt ?? new Date().toISOString(),
    url: params.url ?? null,
    user_agent: params.userAgent ?? null,
    ip: params.ip ?? null,
    provider_message_id: params.providerMessageId ?? null,
    provider_event_id: params.providerEventId ?? null,
    raw_payload: params.rawPayload ?? null,
    is_suspected_bot: params.isSuspectedBot ?? false,
    confidence: params.confidence ?? 1,
  });

  return !error;
}
