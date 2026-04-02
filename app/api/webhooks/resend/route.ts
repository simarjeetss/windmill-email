import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapResendTypeToEvent, isEmailEvent, type ResendWebhookPayload } from "@/lib/resend/map-webhook-event";
import type { EmailEventSource } from "@/lib/supabase/email-events";

export const dynamic = "force-dynamic";

/** Lets you verify in a browser that this route is deployed (Resend uses POST only). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "resend-webhook",
    hint: "Resend sends POST requests with Svix signature headers.",
  });
}

async function upsertSentEmailTimestamps(
  sentId: string,
  eventType: NonNullable<ReturnType<typeof mapResendTypeToEvent>>,
  occurredAt: string
) {
  const supabase = createAdminClient();
  if (eventType === "delivered") {
    await supabase
      .from("sent_emails")
      .update({ delivered_at: occurredAt })
      .eq("id", sentId)
      .is("delivered_at", null);
  }
  if (eventType === "bounce") {
    await supabase
      .from("sent_emails")
      .update({
        bounced_at: occurredAt,
        status: "failed",
        error: "Bounced",
      })
      .eq("id", sentId)
      .in("status", ["pending", "sent"]);
  }
  if (eventType === "complaint") {
    await supabase
      .from("sent_emails")
      .update({
        complaint_at: occurredAt,
        status: "failed",
        error: "Complaint",
      })
      .eq("id", sentId)
      .in("status", ["pending", "sent"]);
  }
  if (eventType === "open") {
    await supabase.from("sent_emails").update({ opened_at: occurredAt }).eq("id", sentId).is("opened_at", null);
  }
  if (eventType === "click") {
    await supabase.from("sent_emails").update({ clicked_at: occurredAt }).eq("id", sentId).is("clicked_at", null);
  }
}

function extractSentEmailId(payload: ResendWebhookPayload): string | null {
  const tags = payload.data?.tags;
  if (!tags) return null;

  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (
        typeof tag === "object" &&
        tag !== null &&
        "name" in tag &&
        "value" in tag &&
        (tag as { name?: unknown }).name === "sent_email_id" &&
        typeof (tag as { value?: unknown }).value === "string"
      ) {
        return (tag as { value: string }).value;
      }
    }
    return null;
  }

  if (typeof tags === "object" && "sent_email_id" in tags) {
    const sentEmailId = (tags as Record<string, unknown>).sent_email_id;
    return typeof sentEmailId === "string" ? sentEmailId : null;
  }

  return null;
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const svixId = req.headers.get("svix-id") ?? req.headers.get("Svix-Id");
  const svixTimestamp = req.headers.get("svix-timestamp") ?? req.headers.get("Svix-Timestamp");
  const svixSignature = req.headers.get("svix-signature") ?? req.headers.get("Svix-Signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const rawBody = await req.text();

  let payload: ResendWebhookPayload;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!isEmailEvent(payload.type)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (payload.type === "email.sent") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (payload.type === "email.failed") {
    const emailId = payload.data?.email_id;
    const sentEmailId = extractSentEmailId(payload);
    if (emailId || sentEmailId) {
      const supabase = createAdminClient();
      const update = supabase
        .from("sent_emails")
        .update({ status: "failed", error: "Send failed (provider)" })
        .in("status", ["pending", "sent"]);
      if (sentEmailId) {
        await update.eq("id", sentEmailId);
      } else {
        await update.eq("resend_id", emailId);
      }
    }
    return NextResponse.json({ ok: true });
  }

  const mapped = mapResendTypeToEvent(payload.type);
  if (!mapped) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const emailId = payload.data?.email_id;
  const sentEmailId = extractSentEmailId(payload);
  if (!emailId && !sentEmailId) return NextResponse.json({ ok: true, ignored: true });

  const supabase = createAdminClient();
  let sent: { id: string; user_id: string; campaign_id: string; contact_id: string } | null = null;
  let findError: { message?: string } | null = null;

  if (sentEmailId) {
    const byTag = await supabase
      .from("sent_emails")
      .select("id, user_id, campaign_id, contact_id")
      .eq("id", sentEmailId)
      .maybeSingle();
    sent = byTag.data;
    findError = byTag.error;
  }

  if (!sent && emailId) {
    const byProviderId = await supabase
      .from("sent_emails")
      .select("id, user_id, campaign_id, contact_id")
      .eq("resend_id", emailId)
      .maybeSingle();
    sent = byProviderId.data;
    findError = byProviderId.error;
  }

  if (findError || !sent) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const occurredAt = payload.created_at ?? payload.data?.created_at ?? new Date().toISOString();
  const eventSource: EmailEventSource = "resend_webhook";

  const { error: insError } = await supabase.from("email_events").insert({
    sent_email_id: sent.id,
    user_id: sent.user_id,
    campaign_id: sent.campaign_id,
    contact_id: sent.contact_id,
    event_type: mapped,
    event_source: eventSource,
    occurred_at: occurredAt,
    provider_message_id: emailId ?? null,
    provider_event_id: svixId,
    raw_payload: payload as unknown as Record<string, unknown>,
    is_suspected_bot: mapped === "open",
    confidence: mapped === "open" ? 0.4 : 1,
  });

  if (insError && (insError as { code?: string }).code === "23505") {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (insError) {
    return NextResponse.json({ error: insError.message }, { status: 500 });
  }

  await upsertSentEmailTimestamps(sent.id, mapped, occurredAt);

  return NextResponse.json({ ok: true });
}
