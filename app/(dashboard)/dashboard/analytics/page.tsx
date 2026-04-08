import Link from "next/link";
import { getAnalyticsOverview } from "@/lib/supabase/analytics";
import { createClient } from "@/lib/supabase/server";
import {
  buildTimeline,
  calculateCampaignStats,
  parseEventStats,
  summarizeContacts,
  type SentEmailRow,
} from "@/lib/analytics/metrics";
import EngagementTrend from "@/components/analytics/engagement-trend";
import AnalyticsFilters from "@/components/analytics/analytics-filters";
import AnalyticsRangeSelector from "@/components/analytics/analytics-range-selector";
import AnalyticsWarningBanner from "@/components/analytics/analytics-warning-banner";
import EmailLog from "@/components/analytics/email-log";
import type { EmailLogEntry } from "@/components/analytics/email-log";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const KPI_DESCRIPTIONS: Record<string, string> = {
  sent: "Total emails sent in the selected window.",
  delivered: "Unique deliveries to recipient mail servers (Resend webhook).",
  opened: "Estimated unique opens based on provider tracking (not a guaranteed human read).",
  openedRaw: "Unique opens including suspected proxy/prefetch opens.",
  clicked: "Unique link clicks tracked per email.",
  openRate: "Estimated opens divided by delivered (or sent if delivery not yet recorded).",
  openRateRaw: "Raw opens divided by delivered (or sent).",
  clickRate: "Unique clicks divided by delivered (or sent).",
  clickToOpenRate: "Unique clicks divided by estimated unique opens.",
};

function formatPercent(value: string) {
  return value === "—" ? "—" : value;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ campaign?: string; range?: string }> | { campaign?: string; range?: string };
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const rawRange = Number(resolvedSearchParams?.range ?? 30);
  const rangeDays = Number.isFinite(rawRange)
    ? Math.max(1, Math.min(rawRange, 365))
    : 30;
  const selectedCampaignId = resolvedSearchParams?.campaign ?? "";
  const { campaigns, rows, error } = await getAnalyticsOverview(rangeDays);

  const filteredRows = selectedCampaignId
    ? rows.filter((row) => row.campaign_id === selectedCampaignId)
    : rows;

  const rowsForEngagement = filteredRows as SentEmailRow[];
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(rangeDays, 365)));
  const { data: selectedRpcData } = await supabase.rpc("email_event_stats", {
    p_since: since.toISOString(),
    p_campaign_id: selectedCampaignId || null,
  });

  const stats = calculateCampaignStats(rowsForEngagement, parseEventStats(selectedRpcData));
  const timeline = buildTimeline(filteredRows as SentEmailRow[], rangeDays);
  const contacts = summarizeContacts(rowsForEngagement);

  const emailLogEntries: EmailLogEntry[] = filteredRows.map((row) => {
    const contact = row.contacts as { email?: string | null; first_name?: string | null; last_name?: string | null; company?: string | null } | null;
    const campaign = row.campaigns as { name?: string | null } | null;
    const name = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ").trim();
    return {
      id: row.id,
      subject: row.subject ?? "",
      body: row.body ?? "",
      recipientName: name || contact?.email || "Unknown",
      recipientEmail: contact?.email ?? "—",
      recipientCompany: contact?.company ?? null,
      campaignName: campaign?.name ?? null,
      status: row.status ?? "pending",
      sentAt: row.sent_at,
      openedAt: row.opened_at,
      clickedAt: row.clicked_at,
    };
  });

  const campaignSummaries = await Promise.all(
    campaigns.map(async (campaign) => {
      const campaignRows = rows.filter((row) => row.campaign_id === campaign.id) as SentEmailRow[];
      const { data: rpcData } = await supabase.rpc("email_event_stats", {
        p_since: since.toISOString(),
        p_campaign_id: campaign.id,
      });
      const summary = calculateCampaignStats(campaignRows as SentEmailRow[], parseEventStats(rpcData));
      return { ...summary, id: campaign.id, name: campaign.name };
    })
  );

  const topCampaign = [...campaignSummaries]
    .filter((summary) => summary.sent > 0)
    .sort((a, b) => b.opened - a.opened)[0];

  if (campaigns.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="rk-fade-up mb-8">
          <h1
            className="text-3xl font-medium mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
          >
            Analytics
          </h1>
          <p className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
            You need at least one campaign to see analytics.
          </p>
        </div>

        <Card className="rk-fade-up rk-delay-1" size="sm">
          <CardHeader>
            <CardTitle>Create your first campaign</CardTitle>
            <CardDescription>
              Analytics unlock once you send to contacts. Start with a campaign and
              send your first outreach.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Link href="/dashboard/campaigns/new">
              <Button size="sm">Create campaign</Button>
            </Link>
            <Link href="/dashboard/campaigns">
              <Button size="sm" variant="outline">
                View campaigns
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <AnalyticsWarningBanner />
      <div className="rk-fade-up flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-medium mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
          >
            Analytics
          </h1>
          <p className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
            Track sends, estimated opens, and clicks by campaign.
          </p>
        </div>
        <AnalyticsRangeSelector
          rangeDays={rangeDays}
          selectedCampaignId={selectedCampaignId}
        />
      </div>

      {error && (
        <div
          className="rk-fade-in mb-6 px-4 py-3 rounded-lg text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      <div className="rk-fade-up rk-delay-1 grid gap-4 lg:grid-cols-[2fr_1fr] mb-8">
        <Card size="sm">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Engagement trend</CardTitle>
                <CardDescription>
                  {filteredRows.length === 0
                    ? "Send your first campaign to populate analytics."
                    : `Last ${rangeDays} days · ${filteredRows.length} emails`}
                </CardDescription>
              </div>
              <AnalyticsFilters
                campaigns={campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name }))}
                selectedCampaignId={selectedCampaignId}
                rangeDays={rangeDays}
              />
            </div>
          </CardHeader>
          <CardContent>
            <EngagementTrend data={timeline} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Top campaign</CardTitle>
              <CardDescription>Highest opens in range</CardDescription>
            </CardHeader>
            <CardContent>
              {topCampaign ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium" style={{ color: "var(--wm-text)" }}>
                    {topCampaign.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--wm-text-muted)" }}>
                    {topCampaign.opened} est. opens · {topCampaign.openRate} est. open rate
                  </div>
                  <Link href={`/dashboard/campaigns/${topCampaign.id}`}>
                    <Button size="sm" variant="outline">
                      View campaign
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-xs" style={{ color: "var(--wm-text-muted)" }}>
                  No open signals yet. Send your next campaign to unlock more data.
                </div>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Delivery snapshot</CardTitle>
              <CardDescription>Sent vs failed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--wm-text-muted)" }}>Sent</span>
                <span style={{ color: "var(--wm-text)" }}>{stats.sent}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--wm-text-muted)" }}>Delivered</span>
                <span style={{ color: "var(--wm-text)" }}>{stats.delivered}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--wm-text-muted)" }}>Failed</span>
                <span style={{ color: "var(--wm-text)" }}>{stats.failed}</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "var(--wm-border)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: stats.sent + stats.failed === 0 ? "0%" : `${Math.round((stats.sent / (stats.sent + stats.failed)) * 100)}%`,
                    background: "var(--wm-accent)",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="rk-fade-up rk-delay-2 grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {[
          { key: "sent", label: "Sent", value: stats.sent },
          { key: "delivered", label: "Delivered", value: stats.delivered },
          { key: "opened", label: "Opens (est.)", value: stats.opened },
          { key: "openedRaw", label: "Opens (raw)", value: stats.openedRaw },
          { key: "clicked", label: "Clicks", value: stats.clicked },
          { key: "openRate", label: "Open rate (est.)", value: formatPercent(stats.openRate) },
          { key: "openRateRaw", label: "Open rate (raw)", value: formatPercent(stats.openRateRaw) },
          { key: "clickRate", label: "Click rate", value: formatPercent(stats.clickRate) },
          { key: "clickToOpenRate", label: "CTOR", value: formatPercent(stats.clickToOpenRate) },
        ].map((card) => (
          <Card key={card.key} size="sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
                  {card.label}
                </CardTitle>
                <div
                  className="text-2xl font-semibold mt-1"
                  style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
                >
                  {card.value}
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    aria-label={`${card.label} info`}
                    className="h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--wm-surface-2)" }}
                  >
                    <span className="text-[11px]" style={{ color: "var(--wm-text-muted)" }}>i</span>
                  </TooltipTrigger>
                  <TooltipContent>{KPI_DESCRIPTIONS[card.key]}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="rk-fade-up rk-delay-3" size="sm">
        <CardHeader>
          <CardTitle>Contact engagement</CardTitle>
          <CardDescription>
            Per-contact delivery status for the selected campaign. Opened counts are estimates from
            tracking events and may include provider/client-side noise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: "var(--wm-text-muted)" }}>
                  <th className="pb-2">Contact</th>
                  <th className="pb-2">Company</th>
                  <th className="pb-2">Sent</th>
                  <th className="pb-2">Opened (est.)</th>
                  <th className="pb-2">Clicked</th>
                  <th className="pb-2">Last activity</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4" style={{ color: "var(--wm-text-muted)" }}>
                      No engagement yet. Send a campaign to populate this table.
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr
                      key={contact.contact_id}
                      style={{ borderTop: "1px solid var(--wm-border)" }}
                    >
                      <td className="py-3">
                        <div className="font-medium" style={{ color: "var(--wm-text)" }}>
                          {contact.name}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--wm-text-muted)" }}>
                          {contact.email}
                        </div>
                      </td>
                      <td className="py-3" style={{ color: "var(--wm-text-muted)" }}>
                        {contact.company ?? "—"}
                      </td>
                      <td className="py-3" style={{ color: "var(--wm-text)" }}>{contact.sent}</td>
                      <td className="py-3" style={{ color: "var(--wm-text)" }}>{contact.opened}</td>
                      <td className="py-3" style={{ color: "var(--wm-text)" }}>{contact.clicked}</td>
                      <td className="py-3" style={{ color: "var(--wm-text-muted)" }}>
                        {formatDate(contact.lastActivity)}
                      </td>
                      <td className="py-3">
                        <span
                          className="px-2 py-1 rounded-full text-[10px] uppercase"
                          style={{
                            background:
                              contact.status === "clicked"
                                ? "rgba(59,130,246,0.12)"
                                : contact.status === "opened"
                                ? "rgba(43,122,95,0.10)"
                                : contact.status === "sent"
                                ? "rgba(217,119,6,0.10)"
                                : contact.status === "failed"
                                ? "rgba(239,68,68,0.10)"
                                : "rgba(100,116,139,0.10)",
                            color:
                              contact.status === "clicked"
                                ? "#3b82f6"
                                : contact.status === "opened"
                                ? "var(--wm-accent)"
                                : contact.status === "sent"
                                ? "#d97706"
                                : contact.status === "failed"
                                ? "#dc2626"
                                : "#64748b",
                          }}
                        >
                          {contact.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Email log — comprehensive per-email detail ──────────────────── */}
      <Card className="rk-fade-up rk-delay-4 mt-8" size="sm">
        <CardHeader>
          <CardTitle>Email log</CardTitle>
          <CardDescription>
            Every email sent — who received it, the subject line, and delivery &amp; engagement.
            Opened times are estimates from tracking events (same rules as KPIs above).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailLog entries={emailLogEntries} />
        </CardContent>
      </Card>
    </div>
  );
}
