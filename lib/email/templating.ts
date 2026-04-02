import type { Contact } from "@/lib/supabase/campaigns";
import type { UserProfile } from "@/lib/supabase/profile";

export type TemplateContext = {
  contact: Contact | null;
  profile: UserProfile | null;
};

export function applyTemplate(text: string, { contact, profile }: TemplateContext): string {
  const senderName = profile?.full_name || "You";
  const senderCompany = profile?.company || "Your Company";

  let out = text;
  if (contact) {
    out = out
      .replace(/\{\{first_name\}\}/g, contact.first_name ?? "there")
      .replace(/\{\{last_name\}\}/g, contact.last_name ?? "")
      .replace(/\{\{company\}\}/g, contact.company ?? "their company");
  }

  out = out
    .replace(/\{\{sender_name\}\}/g, senderName)
    .replace(/\{\{sender_company\}\}/g, senderCompany);

  return out;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br />");
}

export function wrapLinksForTracking(text: string, baseUrl: string, sentEmailId: string): string {
  if (!baseUrl) return text;
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return text.replace(/(https?:\/\/[^\s)]+)(?=\s|$)/g, (match) => {
    const encoded = encodeURIComponent(match);
    return `${normalizedBase}/api/track/click/${sentEmailId}?u=${encoded}`;
  });
}

export function buildTrackedEmail(params: {
  subject: string;
  body: string;
  contact: Contact | null;
  profile: UserProfile | null;
  sentEmailId: string;
  baseUrl: string;
}): { subject: string; text: string; html: string } {
  const { subject, body, contact, profile, sentEmailId, baseUrl } = params;
  const personalizedSubject = applyTemplate(subject, { contact, profile });
  const personalizedBody = applyTemplate(body, { contact, profile });
  const trackedBody = wrapLinksForTracking(personalizedBody, baseUrl, sentEmailId);
  const pixel = baseUrl
    ? `<img src="${baseUrl.replace(/\/$/, "")}/api/track/open/${sentEmailId}" width="1" height="1" style="display:none" alt="" />`
    : "";

  return {
    subject: personalizedSubject,
    text: trackedBody,
    html: `${toHtml(trackedBody)}${pixel}`,
  };
}
