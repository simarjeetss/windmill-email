import { describe, expect, it } from "vitest";

import {
  getCampaignRunLabel,
  getLatestContactStatus,
  getLatestRowsByContact,
  resolveFollowUpAudienceContactIds,
  type FollowUpAudienceRow,
} from "@/lib/campaign-send/follow-up";

const rows: FollowUpAudienceRow[] = [
  {
    id: "row-1",
    contact_id: "contact-clicked",
    status: "sent",
    created_at: "2026-04-20T10:00:00.000Z",
    sent_at: "2026-04-20T10:00:00.000Z",
    opened_at: null,
    clicked_at: null,
  },
  {
    id: "row-2",
    contact_id: "contact-clicked",
    status: "sent",
    created_at: "2026-04-21T10:00:00.000Z",
    sent_at: "2026-04-21T10:00:00.000Z",
    opened_at: "2026-04-21T10:10:00.000Z",
    clicked_at: "2026-04-21T10:15:00.000Z",
  },
  {
    id: "row-3",
    contact_id: "contact-opened",
    status: "sent",
    created_at: "2026-04-21T11:00:00.000Z",
    sent_at: "2026-04-21T11:00:00.000Z",
    opened_at: "2026-04-21T11:20:00.000Z",
    clicked_at: null,
  },
  {
    id: "row-4",
    contact_id: "contact-sent",
    status: "sent",
    created_at: "2026-04-21T12:00:00.000Z",
    sent_at: "2026-04-21T12:00:00.000Z",
    opened_at: null,
    clicked_at: null,
  },
  {
    id: "row-5",
    contact_id: "contact-failed",
    status: "failed",
    created_at: "2026-04-21T13:00:00.000Z",
    sent_at: "2026-04-21T13:00:00.000Z",
    opened_at: null,
    clicked_at: null,
  },
  {
    id: "row-6",
    contact_id: "contact-pending",
    status: "pending",
    created_at: "2026-04-21T14:00:00.000Z",
    sent_at: null,
    opened_at: null,
    clicked_at: null,
  },
  {
    id: "row-7",
    contact_id: "contact-recent-failed",
    status: "sent",
    created_at: "2026-04-20T08:00:00.000Z",
    sent_at: "2026-04-20T08:00:00.000Z",
    opened_at: "2026-04-20T08:30:00.000Z",
    clicked_at: null,
  },
  {
    id: "row-8",
    contact_id: "contact-recent-failed",
    status: "failed",
    created_at: "2026-04-22T08:00:00.000Z",
    sent_at: "2026-04-22T08:00:00.000Z",
    opened_at: null,
    clicked_at: null,
  },
];

describe("follow-up segmentation", () => {
  it("uses the latest send attempt per contact", () => {
    const latestRows = getLatestRowsByContact(rows);
    const latestFailed = latestRows.find((row) => row.contact_id === "contact-recent-failed");

    expect(latestRows).toHaveLength(6);
    expect(latestFailed?.id).toBe("row-8");
    expect(getLatestContactStatus(latestFailed!)).toBe("failed");
  });

  it("resolves follow-up segments with both sent variants", () => {
    expect(resolveFollowUpAudienceContactIds(rows, "clicked")).toEqual(["contact-clicked"]);
    expect(resolveFollowUpAudienceContactIds(rows, "opened")).toEqual(["contact-opened"]);
    expect(resolveFollowUpAudienceContactIds(rows, "failed")).toEqual([
      "contact-failed",
      "contact-recent-failed",
    ]);
    expect(resolveFollowUpAudienceContactIds(rows, "sent_unengaged")).toEqual(["contact-sent"]);
    expect(resolveFollowUpAudienceContactIds(rows, "sent_all")).toEqual([
      "contact-clicked",
      "contact-opened",
      "contact-sent",
    ]);
    expect(resolveFollowUpAudienceContactIds(rows, "pending")).toEqual(["contact-pending"]);
  });

  it("labels run types clearly", () => {
    expect(getCampaignRunLabel("initial", null)).toBe("Initial campaign send");
    expect(getCampaignRunLabel("followup", "sent_unengaged")).toBe("Follow-up: Sent (unengaged)");
    expect(getCampaignRunLabel("retry", null)).toBe("Retry failed emails");
  });
});