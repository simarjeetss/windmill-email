import type { EmailEventType } from "@/lib/supabase/email-events";

export type ResendWebhookPayload = {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    broadcast_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    subject?: string;
    bounce?: { message?: string; subType?: string; type?: string };
    tags?:
      | Record<string, string>
      | Array<{
          name?: string;
          value?: string;
        }>;
    [key: string]: unknown;
  };
};

export function mapResendTypeToEvent(type: string): EmailEventType | null {
  switch (type) {
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "deferred";
    case "email.bounced":
      return "bounce";
    case "email.complained":
      return "complaint";
    case "email.opened":
      return "open";
    case "email.clicked":
      return "click";
    case "email.sent":
      return "sent";
    default:
      return null;
  }
}

export function isEmailEvent(type: string): boolean {
  return type.startsWith("email.");
}
