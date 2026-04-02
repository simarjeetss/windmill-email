"use server";

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
  campaigns?: {
    name?: string | null;
  } | null;
};

export type AnalyticsOverview = {
  campaigns: AnalyticsCampaign[];
  rows: AnalyticsRow[];
  error: string | null;
};

export type OverviewStats = {
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
  openRate: string;
  clickRate: string;
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

export async function getAnalyticsOverview(rangeDays: number): Promise<AnalyticsOverview> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { campaigns: [], rows: [], error: "Not authenticated" };

  const { data: campaigns, error: campaignsError } = await supabase
    .from("campaigns")
    .select("id, name, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (campaignsError) return { campaigns: [], rows: [], error: campaignsError.message };

  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(rangeDays, 365)));

  const { data: rows, error: rowsError } = await supabase
    .from("sent_emails")
    .select(
      "id, campaign_id, contact_id, status, sent_at, opened_at, clicked_at, created_at, contacts(email, first_name, last_name, company), campaigns(name)"
    )
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (rowsError) return { campaigns: campaigns ?? [], rows: [], error: rowsError.message };

  return {
    campaigns: (campaigns ?? []) as AnalyticsCampaign[],
    rows: (rows ?? []) as AnalyticsRow[],
    error: null,
  };
}

function formatRate(numerator: number, denominator: number) {
  if (!denominator) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { sent: 0, opened: 0, clicked: 0, failed: 0, openRate: "—", clickRate: "—" };
  }

  const { data, error } = await supabase
    .from("sent_emails")
    .select("status, opened_at, clicked_at")
    .eq("user_id", user.id);

  if (error || !data) {
    return { sent: 0, opened: 0, clicked: 0, failed: 0, openRate: "—", clickRate: "—" };
  }

  const sent = data.filter((row) => row.status === "sent").length;
  const opened = data.filter((row) => row.opened_at).length;
  const clicked = data.filter((row) => row.clicked_at).length;
  const failed = data.filter((row) => row.status === "failed").length;

  return {
    sent,
    opened,
    clicked,
    failed,
    openRate: formatRate(opened, sent),
    clickRate: formatRate(clicked, sent),
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
