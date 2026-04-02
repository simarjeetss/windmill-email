"use server";

import type { EmailEventTimelineRow, EventStatsBundle, SentEmailRow } from "@/lib/analytics/metrics";
import { buildEngagementDisplayFromEvents, calculateCampaignStats, parseEventStats } from "@/lib/analytics/metrics";
import { createClient } from "@/lib/supabase/server";

export type AnalyticsCampaign = {
  id: string;
  name: string;
  status: string;
};

export type AnalyticsRow = {
  id: string;
  campaign_id: string | null;
  contact_id: string | null;
  status: string | null;
  subject: string | null;
  body: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  /** Trusted open / click times from `email_events` when available (UI should use these) */
  opened_at_display: string | null;
  clicked_at_display: string | null;
  delivered_at?: string | null;
  created_at: string;
  contacts?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
  } | null;
  campaigns?: {
    name?: string | null;
  } | null;
};

export type AnalyticsOverview = {
  campaigns: AnalyticsCampaign[];
  rows: AnalyticsRow[];
  error: string | null;
  /** Aggregates for the selected campaign (or all if none), matching `rangeDays` */
  eventStats: EventStatsBundle | null;
  timelineEvents: EmailEventTimelineRow[];
};

export type OverviewStats = {
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

export type RecentActivity = {
  id: string;
  sent_at: string | null;
  status: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  contact_email: string | null;
  contact_name: string | null;
  campaign_name: string | null;
};

export async function getAnalyticsOverview(
  rangeDays: number,
  campaignId?: string | null
): Promise<AnalyticsOverview> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { campaigns: [], rows: [], error: "Not authenticated", eventStats: null, timelineEvents: [] };
  }

  const { data: campaigns, error: campaignsError } = await supabase
    .from("campaigns")
    .select("id, name, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (campaignsError) {
    return { campaigns: [], rows: [], error: campaignsError.message, eventStats: null, timelineEvents: [] };
  }

  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(rangeDays, 365)));

  const { data: rows, error: rowsError } = await supabase
    .from("sent_emails")
    .select(
      "id, campaign_id, contact_id, status, subject, body, sent_at, opened_at, clicked_at, delivered_at, created_at, contacts(email, first_name, last_name, company), campaigns(name)"
    )
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (rowsError) {
    return { campaigns: campaigns ?? [], rows: [], error: rowsError.message, eventStats: null, timelineEvents: [] };
  }

  const list = rows ?? [];
  const sentIds = list.map((r) => r.id).filter(Boolean);
  const eventsBySent = new Map<
    string,
    Array<{ event_type: string; occurred_at: string; is_suspected_bot: boolean }>
  >();

  if (sentIds.length > 0) {
    const { data: engagementEv } = await supabase
      .from("email_events")
      .select("sent_email_id, event_type, occurred_at, is_suspected_bot")
      .eq("user_id", user.id)
      .in("sent_email_id", sentIds);

    for (const e of engagementEv ?? []) {
      const sid = e.sent_email_id as string | null;
      if (!sid) continue;
      if (!eventsBySent.has(sid)) eventsBySent.set(sid, []);
      eventsBySent.get(sid)!.push({
        event_type: e.event_type as string,
        occurred_at: e.occurred_at as string,
        is_suspected_bot: Boolean(e.is_suspected_bot),
      });
    }
  }

  const enrichedRows = list.map((row) => {
    const evs = eventsBySent.get(row.id) ?? [];
    const display = buildEngagementDisplayFromEvents(row, evs);
    return {
      ...row,
      opened_at_display: display.opened_at_display,
      clicked_at_display: display.clicked_at_display,
    };
  });

  let eventStats: EventStatsBundle | null = null;
  const { data: rpcData, error: rpcError } = await supabase.rpc("email_event_stats", {
    p_since: since.toISOString(),
    p_campaign_id: campaignId || null,
  });
  if (!rpcError) {
    eventStats = parseEventStats(rpcData);
  }

  let timelineQuery = supabase
    .from("email_events")
    .select("event_type, occurred_at, is_suspected_bot")
    .eq("user_id", user.id)
    .gte("occurred_at", since.toISOString());
  if (campaignId) {
    timelineQuery = timelineQuery.eq("campaign_id", campaignId);
  }
  const { data: evRows } = await timelineQuery.order("occurred_at", { ascending: true });

  return {
    campaigns: (campaigns ?? []) as AnalyticsCampaign[],
    rows: enrichedRows as AnalyticsRow[],
    error: null,
    eventStats,
    timelineEvents: (evRows ?? []) as EmailEventTimelineRow[],
  };
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      openedRaw: 0,
      clicked: 0,
      failed: 0,
      openRate: "—",
      openRateRaw: "—",
      clickRate: "—",
      clickToOpenRate: "—",
    };
  }

  const { data, error } = await supabase
    .from("sent_emails")
    .select("status, opened_at, clicked_at, delivered_at, campaign_id, contact_id, id, sent_at, created_at")
    .eq("user_id", user.id);

  if (error || !data) {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      openedRaw: 0,
      clicked: 0,
      failed: 0,
      openRate: "—",
      openRateRaw: "—",
      clickRate: "—",
      clickToOpenRate: "—",
    };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("email_event_stats", {
    p_since: new Date(0).toISOString(),
    p_campaign_id: null,
  });
  const eventStats = !rpcError ? parseEventStats(rpcData) : null;

  const summary = calculateCampaignStats(data as SentEmailRow[], eventStats);

  return {
    sent: summary.sent,
    delivered: summary.delivered,
    opened: summary.opened,
    openedRaw: summary.openedRaw,
    clicked: summary.clicked,
    failed: summary.failed,
    openRate: summary.openRate,
    openRateRaw: summary.openRateRaw,
    clickRate: summary.clickRate,
    clickToOpenRate: summary.clickToOpenRate,
  };
}

export async function getRecentActivity(limit = 6): Promise<RecentActivity[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("sent_emails")
    .select(
      "id, sent_at, status, opened_at, clicked_at, contacts(email, first_name, last_name), campaigns(name)"
    )
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => {
    const contact = row.contacts as { email?: string | null; first_name?: string | null; last_name?: string | null } | null;
    const campaign = row.campaigns as { name?: string | null } | null;
    const name = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ").trim();

    return {
      id: row.id as string,
      sent_at: row.sent_at as string | null,
      status: row.status as string | null,
      opened_at: row.opened_at as string | null,
      clicked_at: row.clicked_at as string | null,
      contact_email: contact?.email ?? null,
      contact_name: name || null,
      campaign_name: campaign?.name ?? null,
    };
  });
}
