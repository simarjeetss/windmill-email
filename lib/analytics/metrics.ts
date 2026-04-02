export type SentEmailRow = {
  id: string;
  campaign_id: string | null;
  contact_id: string | null;
  status: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
  contacts?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
  } | null;
};

export type CampaignStatsSummary = {
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
  openRate: string;
  clickRate: string;
};

export type TimelinePoint = {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
};

export type ContactEngagement = {
  contact_id: string;
  email: string;
  name: string;
  company: string | null;
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
  lastActivity: string | null;
  status: "clicked" | "opened" | "sent" | "failed" | "pending";
};

function formatRate(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function getDateKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    .toISOString()
    .slice(0, 10);
}

function isWithinRange(dateKey: string, startKey: string, endKey: string): boolean {
  return dateKey >= startKey && dateKey <= endKey;
}

export function calculateCampaignStats(rows: SentEmailRow[]): CampaignStatsSummary {
  const sent = rows.filter((row) => row.status === "sent").length;
  const opened = rows.filter((row) => Boolean(row.opened_at)).length;
  const clicked = rows.filter((row) => Boolean(row.clicked_at)).length;
  const failed = rows.filter((row) => row.status === "failed").length;

  return {
    sent,
    opened,
    clicked,
    failed,
    openRate: formatRate(opened, sent),
    clickRate: formatRate(clicked, sent),
  };
}

export function buildTimeline(rows: SentEmailRow[], rangeDays: number): TimelinePoint[] {
  const days = Math.max(1, Math.min(rangeDays, 365));
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));

  const startKey = getDateKey(startDate);
  const endKey = getDateKey(endDate);

  const buckets = new Map<string, TimelinePoint>();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const key = getDateKey(date);
    buckets.set(key, { date: key, sent: 0, opened: 0, clicked: 0, failed: 0 });
  }

  const increment = (value: string | null, field: keyof Omit<TimelinePoint, "date">) => {
    if (!value) return;
    const key = getDateKey(value);
    if (!isWithinRange(key, startKey, endKey)) return;
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket[field] += 1;
  };

  rows.forEach((row) => {
    increment(row.sent_at ?? row.created_at, "sent");
    increment(row.opened_at, "opened");
    increment(row.clicked_at, "clicked");
    if (row.status === "failed") {
      increment(row.sent_at ?? row.created_at, "failed");
    }
  });

  return Array.from(buckets.values());
}

export function summarizeContacts(rows: SentEmailRow[]): ContactEngagement[] {
  const map = new Map<string, ContactEngagement>();

  rows.forEach((row) => {
    if (!row.contact_id) return;
    const existing = map.get(row.contact_id);
    const email = row.contacts?.email ?? "Unknown";
    const name = [row.contacts?.first_name, row.contacts?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    const displayName = name || email;

    const next = existing ?? {
      contact_id: row.contact_id,
      email,
      name: displayName,
      company: row.contacts?.company ?? null,
      sent: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
      lastActivity: null,
      status: "pending" as const,
    };

    if (row.status === "sent") next.sent += 1;
    if (row.status === "failed") next.failed += 1;
    if (row.opened_at) next.opened += 1;
    if (row.clicked_at) next.clicked += 1;

    const timestamps = [row.sent_at, row.opened_at, row.clicked_at].filter(
      Boolean
    ) as string[];
    timestamps.forEach((timestamp) => {
      if (!next.lastActivity || timestamp > next.lastActivity) {
        next.lastActivity = timestamp;
      }
    });

    if (next.clicked > 0) next.status = "clicked";
    else if (next.opened > 0) next.status = "opened";
    else if (next.sent > 0) next.status = "sent";
    else if (next.failed > 0) next.status = "failed";

    map.set(row.contact_id, next);
  });

  return Array.from(map.values()).sort((a, b) => {
    if (!a.lastActivity && !b.lastActivity) return 0;
    if (!a.lastActivity) return 1;
    if (!b.lastActivity) return -1;
    return b.lastActivity.localeCompare(a.lastActivity);
  });
}
