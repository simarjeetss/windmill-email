export type SentEmailRow = {
  id: string;
  campaign_id: string | null;
  contact_id: string | null;
  status: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  delivered_at?: string | null;
  created_at: string;
  contacts?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
  } | null;
};

/** Rows from `email_events` for timeline bucketing */
export type EmailEventTimelineRow = {
  sent_email_id?: string | null;
  event_type: string;
  occurred_at: string;
  is_suspected_bot: boolean;
};

export type EventStatsBundle = {
  delivered_unique: number;
  open_unique_raw: number;
  open_unique_trusted: number;
  click_unique: number;
};

export type CampaignStatsSummary = {
  sent: number;
  delivered: number;
  opened: number;
  openedRaw: number;
  clicked: number;
  failed: number;
  openRate: string;
  openRateRaw: string;
  clickRate: string;
  clickToOpenRate: string;
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

export function parseEventStats(data: unknown): EventStatsBundle | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  return {
    delivered_unique: Number(o.delivered_unique ?? 0),
    open_unique_raw: Number(o.open_unique_raw ?? 0),
    open_unique_trusted: Number(o.open_unique_trusted ?? 0),
    click_unique: Number(o.click_unique ?? 0),
  };
}

/**
 * Prefer explicit delivery telemetry when delivery outcomes are fully accounted
 * for; otherwise fall back to sent to avoid over-inflating rates during
 * partial webhook sync.
 */
export function rateDenominator(sent: number, deliveredExplicit: number, failed: number): number {
  if (sent <= 0) return deliveredExplicit > 0 ? deliveredExplicit : 0;
  const deliveryCoverage = deliveredExplicit + Math.max(0, failed);
  if (deliveredExplicit > 0 && deliveryCoverage >= sent) return deliveredExplicit;
  return sent;
}

/** Minimal row from `email_events` for per-send engagement display */
export type EmailEventEngagementRow = {
  event_type: string;
  occurred_at: string;
  is_suspected_bot: boolean;
};

function minIso(timestamps: string[]): string {
  return timestamps.reduce((a, b) => (a < b ? a : b));
}

/**
 * Derive UI open/click times from `email_events` when present.
 * If any events exist for this send, trusted opens exclude `is_suspected_bot`; otherwise fall back to `sent_emails` columns (legacy).
 */
export function buildEngagementDisplayFromEvents(
  row: { opened_at: string | null; clicked_at: string | null },
  events: EmailEventEngagementRow[] | undefined
): { opened_at_display: string | null; clicked_at_display: string | null } {
  if (!events || events.length === 0) {
    return {
      opened_at_display: row.opened_at,
      clicked_at_display: row.clicked_at,
    };
  }
  const trustedOpens = events.filter((e) => e.event_type === "open" && !e.is_suspected_bot);
  const clicks = events.filter((e) => e.event_type === "click");
  return {
    opened_at_display: trustedOpens.length ? minIso(trustedOpens.map((e) => e.occurred_at)) : null,
    clicked_at_display: clicks.length ? minIso(clicks.map((e) => e.occurred_at)) : null,
  };
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

export function calculateCampaignStats(
  rows: SentEmailRow[],
  eventStats?: EventStatsBundle | null
): CampaignStatsSummary {
  const sent = rows.filter((row) => row.status === "sent").length;
  const failed = rows.filter((row) => row.status === "failed").length;

  const legacyOpened = rows.filter((row) => Boolean(row.opened_at)).length;
  const legacyClicked = rows.filter((row) => Boolean(row.clicked_at)).length;
  const legacyDelivered = rows.filter((row) => Boolean(row.delivered_at)).length;

  const es = eventStats ?? null;
  const hasEventData = Boolean(
    es &&
      (es.delivered_unique > 0 ||
        es.open_unique_raw > 0 ||
        es.open_unique_trusted > 0 ||
        es.click_unique > 0)
  );

  const openedRaw = hasEventData && es ? es.open_unique_raw : legacyOpened;
  const openedTrusted = hasEventData && es ? es.open_unique_trusted : legacyOpened;
  const clicked = hasEventData && es ? es.click_unique : legacyClicked;
  const deliveredExplicit = hasEventData && es ? Math.max(es.delivered_unique, legacyDelivered) : legacyDelivered;
  // Open/click imply a minimum level of delivery even when explicit delivery webhooks are missing.
  const deliveredInferred = Math.max(openedRaw, clicked);
  const delivered = Math.max(deliveredExplicit, deliveredInferred);

  const denom = rateDenominator(sent, deliveredExplicit, failed);

  return {
    sent,
    delivered,
    opened: openedTrusted,
    openedRaw,
    clicked,
    failed,
    openRate: formatRate(openedTrusted, denom),
    openRateRaw: formatRate(openedRaw, denom),
    clickRate: formatRate(clicked, denom),
    clickToOpenRate: openedTrusted > 0 ? formatRate(clicked, openedTrusted) : "—",
  };
}

export function buildTimeline(
  rows: SentEmailRow[],
  rangeDays: number,
  events?: EmailEventTimelineRow[]
): TimelinePoint[] {
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
    if (row.status === "failed") {
      increment(row.sent_at ?? row.created_at, "failed");
    }
  });

  if (events && events.length > 0) {
    const hasSentEmailIds = events.some((ev) => Boolean(ev.sent_email_id));

    if (hasSentEmailIds) {
      const firstOpenByEmail = new Map<string, string>();
      const firstClickByEmail = new Map<string, string>();

      for (const ev of events) {
        const sentEmailId = ev.sent_email_id;
        if (!sentEmailId) continue;

        if (ev.event_type === "open" && !ev.is_suspected_bot) {
          const prev = firstOpenByEmail.get(sentEmailId);
          if (!prev || ev.occurred_at < prev) {
            firstOpenByEmail.set(sentEmailId, ev.occurred_at);
          }
        }

        if (ev.event_type === "click") {
          const prev = firstClickByEmail.get(sentEmailId);
          if (!prev || ev.occurred_at < prev) {
            firstClickByEmail.set(sentEmailId, ev.occurred_at);
          }
        }
      }

      for (const occurredAt of firstOpenByEmail.values()) {
        increment(occurredAt, "opened");
      }
      for (const occurredAt of firstClickByEmail.values()) {
        increment(occurredAt, "clicked");
      }
    } else {
      events.forEach((ev) => {
        if (ev.event_type === "open" && !ev.is_suspected_bot) {
          increment(ev.occurred_at, "opened");
        }
        if (ev.event_type === "click") {
          increment(ev.occurred_at, "clicked");
        }
      });
    }
  } else {
    rows.forEach((row) => {
      increment(row.opened_at, "opened");
      increment(row.clicked_at, "clicked");
    });
  }

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
