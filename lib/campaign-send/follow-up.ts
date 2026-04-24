export type CampaignRunType = "initial" | "followup" | "retry";

export type FollowUpSegment =
  | "failed"
  | "opened"
  | "clicked"
  | "sent_all"
  | "sent_unengaged"
  | "pending";

export type FollowUpAudienceRow = {
  id: string;
  contact_id: string | null;
  status: string | null;
  created_at: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
};

export type LatestContactStatus = "clicked" | "opened" | "sent" | "failed" | "pending";

export function getCampaignRunLabel(
  runType: CampaignRunType,
  segment: FollowUpSegment | null | undefined
): string {
  if (runType === "retry") return "Retry failed emails";
  if (runType === "followup" && segment) {
    return `Follow-up: ${followUpSegmentLabel(segment)}`;
  }
  return "Initial campaign send";
}

export function followUpSegmentLabel(segment: FollowUpSegment): string {
  if (segment === "failed") return "Failed";
  if (segment === "opened") return "Opened";
  if (segment === "clicked") return "Clicked";
  if (segment === "sent_all") return "Sent (all)";
  if (segment === "sent_unengaged") return "Sent (unengaged)";
  return "Pending";
}

export function getLatestContactStatus(row: FollowUpAudienceRow): LatestContactStatus {
  if (row.clicked_at) return "clicked";
  if (row.opened_at) return "opened";
  if (row.status === "failed") return "failed";
  if (row.status === "sent") return "sent";
  return "pending";
}

export function getLatestRowsByContact(rows: FollowUpAudienceRow[]): FollowUpAudienceRow[] {
  const latestByContact = new Map<string, FollowUpAudienceRow>();

  for (const row of rows) {
    if (!row.contact_id) continue;
    const existing = latestByContact.get(row.contact_id);
    if (!existing || compareAttemptTimestamps(row, existing) > 0) {
      latestByContact.set(row.contact_id, row);
    }
  }

  return Array.from(latestByContact.values());
}

export function resolveFollowUpAudienceContactIds(
  rows: FollowUpAudienceRow[],
  segment: FollowUpSegment
): string[] {
  return getLatestRowsByContact(rows)
    .filter((row) => matchesFollowUpSegment(row, segment))
    .map((row) => row.contact_id)
    .filter((contactId): contactId is string => Boolean(contactId));
}

export function matchesFollowUpSegment(
  row: FollowUpAudienceRow,
  segment: FollowUpSegment
): boolean {
  const latestStatus = getLatestContactStatus(row);

  if (segment === "failed") return latestStatus === "failed";
  if (segment === "opened") return latestStatus === "opened";
  if (segment === "clicked") return latestStatus === "clicked";
  if (segment === "sent_all") {
    return latestStatus === "sent" || latestStatus === "opened" || latestStatus === "clicked";
  }
  if (segment === "sent_unengaged") return latestStatus === "sent";
  return latestStatus === "pending";
}

function compareAttemptTimestamps(a: FollowUpAudienceRow, b: FollowUpAudienceRow): number {
  const aAttempt = a.sent_at ?? a.created_at;
  const bAttempt = b.sent_at ?? b.created_at;

  if (aAttempt > bAttempt) return 1;
  if (aAttempt < bAttempt) return -1;

  if (a.created_at > b.created_at) return 1;
  if (a.created_at < b.created_at) return -1;

  if (a.id > b.id) return 1;
  if (a.id < b.id) return -1;
  return 0;
}