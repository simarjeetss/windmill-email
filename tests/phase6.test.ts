import { describe, it, expect } from "vitest";
import {
  buildTimeline,
  calculateCampaignStats,
  summarizeContacts,
  type SentEmailRow,
} from "@/lib/analytics/metrics";

const dayKey = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    .toISOString()
    .slice(0, 10);

const baseDate = new Date();
const twoDaysAgo = new Date(baseDate);
twoDaysAgo.setDate(baseDate.getDate() - 2);
const oneDayAgo = new Date(baseDate);
oneDayAgo.setDate(baseDate.getDate() - 1);

const rows: SentEmailRow[] = [
  {
    id: "1",
    campaign_id: "c1",
    contact_id: "p1",
    status: "sent",
    sent_at: twoDaysAgo.toISOString(),
    opened_at: new Date(twoDaysAgo.getTime() + 60 * 60 * 1000).toISOString(),
    clicked_at: null,
    created_at: twoDaysAgo.toISOString(),
    contacts: { email: "a@example.com", first_name: "Ana", last_name: "Ray", company: "Acme" },
  },
  {
    id: "2",
    campaign_id: "c1",
    contact_id: "p1",
    status: "sent",
    sent_at: oneDayAgo.toISOString(),
    opened_at: null,
    clicked_at: new Date(oneDayAgo.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    created_at: oneDayAgo.toISOString(),
    contacts: { email: "a@example.com", first_name: "Ana", last_name: "Ray", company: "Acme" },
  },
  {
    id: "3",
    campaign_id: "c1",
    contact_id: "p2",
    status: "failed",
    sent_at: oneDayAgo.toISOString(),
    opened_at: null,
    clicked_at: null,
    created_at: oneDayAgo.toISOString(),
    contacts: { email: "b@example.com", first_name: "Ben", last_name: null, company: null },
  },
];

describe("analytics metrics", () => {
  it("calculates campaign stats", () => {
    const stats = calculateCampaignStats(rows);
    expect(stats.sent).toBe(2);
    expect(stats.opened).toBe(1);
    expect(stats.clicked).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.openRate).toBe("50%");
    expect(stats.clickRate).toBe("50%");
  });

  it("builds a timeline with sent/opened/clicked", () => {
    const timeline = buildTimeline(rows, 3);
  const first = timeline.find((point) => point.date === dayKey(twoDaysAgo));
  const second = timeline.find((point) => point.date === dayKey(oneDayAgo));
    expect(first?.sent).toBe(1);
    expect(first?.opened).toBe(1);
    expect(second?.clicked).toBe(1);
    expect(second?.failed).toBe(1);
  });

  it("summarizes contacts", () => {
    const contacts = summarizeContacts(rows);
    const ana = contacts.find((contact) => contact.contact_id === "p1");
    expect(ana?.sent).toBe(2);
    expect(ana?.opened).toBe(1);
    expect(ana?.clicked).toBe(1);
    expect(ana?.status).toBe("clicked");
  });
});
