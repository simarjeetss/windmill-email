import { describe, it, expect } from "vitest";
import { applyTemplate, wrapLinksForTracking, buildTrackedEmail } from "@/lib/email/templating";
import type { Contact } from "@/lib/supabase/campaigns";
import type { UserProfile } from "@/lib/supabase/profile";

const contact: Contact = {
  id: "c1",
  campaign_id: "camp-1",
  user_id: "user-1",
  email: "alice@example.com",
  first_name: "Alice",
  last_name: "Jones",
  company: "Acme",
  created_at: new Date().toISOString(),
};

const profile: UserProfile = {
  id: "user-1",
  full_name: "Sam Sender",
  company: "SenderCo",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("templating helpers", () => {
  it("replaces contact and sender variables", () => {
    const text = "Hi {{first_name}} from {{company}} — {{sender_name}} at {{sender_company}}";
    const result = applyTemplate(text, { contact, profile });
    expect(result).toContain("Hi Alice from Acme");
    expect(result).toContain("Sam Sender at SenderCo");
  });

  it("wraps links with tracking", () => {
    const body = "Visit https://example.com and http://example.org";
    const tracked = wrapLinksForTracking(body, "https://app.test", "sent-1");
    expect(tracked).toContain("/api/track/click/sent-1?u=");
  });

  it("builds tracked html with pixel", () => {
    const email = buildTrackedEmail({
      subject: "Hello {{first_name}}",
      body: "Welcome to {{company}}",
      contact,
      profile,
      sentEmailId: "sent-2",
      baseUrl: "https://app.test",
    });
    expect(email.subject).toContain("Hello Alice");
    expect(email.html).toContain("/api/track/open/sent-2");
  });
});
