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
  // Do not set `opened_at` from `email.opened` — provider-reported opens include MPP/prefetch and
  // duplicate pixel data. Trust only the tracking pixel after bot filtering (see track/open route).
  if (eventType === "click") {
    await supabase.from("sent_emails").update({ clicked_at: occurredAt }).eq("id", sentId).is("clicked_at", null);
  }
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
    if (emailId) {
      const supabase = createAdminClient();
      await supabase
        .from("sent_emails")
        .update({ status: "failed", error: "Send failed (provider)" })
        .eq("resend_id", emailId)
        .in("status", ["pending", "sent"]);
    }
    return NextResponse.json({ ok: true });
  }

  const mapped = mapResendTypeToEvent(payload.type);
  if (!mapped) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const emailId = payload.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = createAdminClient();
  const { data: sent, error: findError } = await supabase
    .from("sent_emails")
    .select("id, user_id, campaign_id, contact_id")
    .eq("resend_id", emailId)
    .maybeSingle();

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
    provider_message_id: emailId,
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
