import { describe, it, expect, beforeAll } from "vitest";
import { applyTemplate, wrapLinksForTracking, buildTrackedEmail } from "@/lib/email/templating";

beforeAll(() => {
  process.env.TRACKING_SECRET = "test-tracking-secret-for-vitest";
});
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
    const tsSec = 1_700_000_000;
    const tracked = wrapLinksForTracking(body, "https://app.test", "sent-1", tsSec);
    expect(tracked).toContain("/api/track/click/sent-1?u=");
    expect(tracked).toContain("&ts=");
    expect(tracked).toContain("&sig=");
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
    expect(email.html).toContain("ts=");
    expect(email.html).toContain("sig=");
  });
});
