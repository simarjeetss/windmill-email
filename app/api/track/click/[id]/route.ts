import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClickSignature } from "@/lib/email/tracking";
import { insertEmailEvent } from "@/lib/supabase/email-events";

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const target = url.searchParams.get("u");

  if (!target) {
    return NextResponse.json({ error: "Missing target url" }, { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    return NextResponse.json({ error: "Invalid target url" }, { status: 400 });
  }

  const tsParam = url.searchParams.get("ts");
  const sigParam = url.searchParams.get("sig");
  const tsNum = tsParam != null ? Number(tsParam) : NaN;
  const hasSigned = Boolean(tsParam && sigParam);
  const signedOk =
    hasSigned &&
    Number.isFinite(tsNum) &&
    Boolean(sigParam && verifyClickSignature(id, tsNum, decoded, sigParam));

  const legacy = !hasSigned;
  const shouldRecord = legacy || signedOk;

  const userAgent = req.headers.get("user-agent");
  const ip = clientIp(req);
  const referer = req.headers.get("referer");

  if (shouldRecord) {
    try {
      const supabase = createAdminClient();
      const now = new Date().toISOString();

      await insertEmailEvent({
        sentEmailId: id,
        eventType: "click",
        eventSource: "track_click",
        occurredAt: now,
        url: decoded,
        userAgent,
        ip,
        rawPayload: referer ? { referer } : null,
        confidence: legacy ? 0.95 : 1,
      });

      await supabase
        .from("sent_emails")
        .update({ clicked_at: now })
        .eq("id", id)
        .is("clicked_at", null);
    } catch {
      // ignore tracking failure; still redirect
    }
  }

  return NextResponse.redirect(decoded, 302);
}
