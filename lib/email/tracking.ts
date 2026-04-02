import { createHmac, timingSafeEqual } from "crypto";

/** Max age for signed tracking links (seconds). */
export const TRACKING_MAX_AGE_SEC = 90 * 24 * 60 * 60; // 90 days

function getSecret(): string {
  const s = process.env.TRACKING_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) {
    throw new Error("Missing TRACKING_SECRET or SUPABASE_SERVICE_ROLE_KEY for signing.");
  }
  return s;
}

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function signTrackingPayload(parts: string[]): string {
  const secret = getSecret();
  return hmacHex(secret, parts.join("|"));
}

/**
 * Open pixel: sign sentEmailId + timestamp.
 */
export function buildOpenSignature(sentEmailId: string, tsSec: number): string {
  return signTrackingPayload(["open", sentEmailId, String(tsSec)]);
}

export function verifyOpenSignature(sentEmailId: string, tsSec: number, sig: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (tsSec > now + 120) return false;
  if (now - tsSec > TRACKING_MAX_AGE_SEC) return false;
  const expected = buildOpenSignature(sentEmailId, tsSec);
  return safeEqual(expected, sig);
}

/**
 * Click redirect: sign sentEmailId + timestamp + target URL so the URL cannot be swapped.
 */
export function buildClickSignature(sentEmailId: string, tsSec: number, targetUrl: string): string {
  return signTrackingPayload(["click", sentEmailId, String(tsSec), targetUrl]);
}

export function verifyClickSignature(
  sentEmailId: string,
  tsSec: number,
  targetUrl: string,
  sig: string
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (tsSec > now + 120) return false;
  if (now - tsSec > TRACKING_MAX_AGE_SEC) return false;
  const expected = buildClickSignature(sentEmailId, tsSec, targetUrl);
  return safeEqual(expected, sig);
}

/**
 * Known privacy-proxy / prefetch / security-scanner patterns.
 * Real human opens often arrive with a normal browser UA; many false positives use these or empty UA.
 * (Apple Mail Privacy can still mimic Safari — pixel opens cannot be perfect.)
 */
const BOT_UA_SUBSTRINGS = [
  "GoogleImageProxy",
  "YahooMailProxy",
  "Outlook-iOS",
  "Outlook-Android",
  "Proofpoint",
  "Mimecast",
  "Barracuda",
  "Sophos",
  "IronPort",
  "Cisco-Email",
  "Forcepoint",
  "Symantec",
  "McAfee",
  "Trend Micro",
  "MessageLabs",
  "Mail.RU_Bot",
  "Amazon-Route53-Health",
];

export function classifyOpenRequest(userAgent: string | null): {
  isSuspectedBot: boolean;
  confidence: number;
} {
  if (!userAgent || userAgent.trim() === "") {
    return { isSuspectedBot: true, confidence: 0.35 };
  }
  const ua = userAgent;
  const lower = ua.toLowerCase();
  for (const s of BOT_UA_SUBSTRINGS) {
    if (lower.includes(s.toLowerCase())) {
      return { isSuspectedBot: true, confidence: 0.25 };
    }
  }
  return { isSuspectedBot: false, confidence: 1 };
}
