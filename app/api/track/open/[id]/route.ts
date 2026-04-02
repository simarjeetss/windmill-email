import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyOpenRequest, verifyOpenSignature } from "@/lib/email/tracking";
import { insertEmailEvent } from "@/lib/supabase/email-events";

const ONE_BY_ONE_GIF = Buffer.from(
  "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

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
  const tsParam = url.searchParams.get("ts");
  const sigParam = url.searchParams.get("sig");
  const userAgent = req.headers.get("user-agent");
  const ip = clientIp(req);

  const tsNum = tsParam != null ? Number(tsParam) : NaN;
  const hasSigned = Boolean(tsParam && sigParam);
  const signedOk =
    hasSigned &&
    Number.isFinite(tsNum) &&
    Boolean(sigParam && verifyOpenSignature(id, tsNum, sigParam));

  const legacy = !hasSigned;
  const { isSuspectedBot, confidence } = classifyOpenRequest(userAgent);

  const shouldRecord = legacy || signedOk;
  /** Only human-trusted opens update `opened_at` (used in UI). Prefetch/proxy hits still log to `email_events`. */
  const shouldSetOpenedAt = shouldRecord && !isSuspectedBot;

  if (shouldRecord) {
    try {
      const supabase = createAdminClient();
      const now = new Date().toISOString();

      await insertEmailEvent({
        sentEmailId: id,
        eventType: "open",
        eventSource: "track_pixel",
        occurredAt: now,
        userAgent,
        ip,
        isSuspectedBot,
        confidence: legacy ? confidence * 0.9 : confidence,
      });

      if (shouldSetOpenedAt) {
        await supabase
          .from("sent_emails")
          .update({ opened_at: now })
          .eq("id", id)
          .is("opened_at", null);
      }
    } catch {
      // Ignore tracking failures; still return pixel
    }
  }

  return new NextResponse(ONE_BY_ONE_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
