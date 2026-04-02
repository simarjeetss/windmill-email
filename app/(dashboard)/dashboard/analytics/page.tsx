import Link from "next/link";
import { getAnalyticsOverview } from "@/lib/supabase/analytics";
import {
  buildTimeline,
  calculateCampaignStats,
  summarizeContacts,
  type SentEmailRow,
} from "@/lib/analytics/metrics";
import EngagementTrend from "@/components/analytics/engagement-trend";
import AnalyticsFilters from "@/components/analytics/analytics-filters";
import AnalyticsRangeSelector from "@/components/analytics/analytics-range-selector";
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
  opened: "Unique opens tracked via pixel.",
  clicked: "Unique link clicks tracked per email.",
  openRate: "Opens divided by total sent.",
  clickRate: "Clicks divided by total sent.",
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
  const { campaigns, rows, error } = await getAnalyticsOverview(rangeDays);
  const selectedCampaignId = resolvedSearchParams?.campaign ?? "";

  const filteredRows = selectedCampaignId
    ? rows.filter((row) => row.campaign_id === selectedCampaignId)
    : rows;

  const stats = calculateCampaignStats(filteredRows as SentEmailRow[]);
  const timeline = buildTimeline(filteredRows as SentEmailRow[], rangeDays);
  const contacts = summarizeContacts(filteredRows as SentEmailRow[]);

  const campaignSummaries = campaigns.map((campaign) => {
    const campaignRows = rows.filter((row) => row.campaign_id === campaign.id);
    const summary = calculateCampaignStats(campaignRows as SentEmailRow[]);
    return { ...summary, id: campaign.id, name: campaign.name };
  });

  const topCampaign = [...campaignSummaries]
    .filter((summary) => summary.sent > 0)
    .sort((a, b) => b.opened - a.opened)[0];

  if (campaigns.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="rk-fade-up mb-8">
          <h1
            className="text-3xl font-medium mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
          >
            Analytics
          </h1>
          <p className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
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
      <div className="rk-fade-up flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-medium mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
          >
            Analytics
          </h1>
          <p className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
            Track sends, opens, and clicks by campaign.
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
                  <div className="text-sm font-medium" style={{ color: "var(--rk-text)" }}>
                    {topCampaign.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--rk-text-muted)" }}>
                    {topCampaign.opened} opens · {topCampaign.openRate} open rate
                  </div>
                  <Link href={`/dashboard/campaigns/${topCampaign.id}`}>
                    <Button size="sm" variant="outline">
                      View campaign
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-xs" style={{ color: "var(--rk-text-muted)" }}>
                  No opens yet. Send your next campaign to unlock more data.
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
                <span style={{ color: "var(--rk-text-muted)" }}>Sent</span>
                <span style={{ color: "var(--rk-text)" }}>{stats.sent}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--rk-text-muted)" }}>Failed</span>
                <span style={{ color: "var(--rk-text)" }}>{stats.failed}</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: stats.sent + stats.failed === 0 ? "0%" : `${Math.round((stats.sent / (stats.sent + stats.failed)) * 100)}%`,
                    background: "var(--rk-gold)",
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
          { key: "opened", label: "Opened", value: stats.opened },
          { key: "clicked", label: "Clicked", value: stats.clicked },
          { key: "openRate", label: "Open rate", value: formatPercent(stats.openRate) },
          { key: "clickRate", label: "Click rate", value: formatPercent(stats.clickRate) },
        ].map((card) => (
          <Card key={card.key} size="sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
                  {card.label}
                </CardTitle>
                <div
                  className="text-2xl font-semibold mt-1"
                  style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
                >
                  {card.value}
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    aria-label={`${card.label} info`}
                    className="h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <span className="text-[11px]" style={{ color: "var(--rk-text-muted)" }}>i</span>
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
            Per-contact delivery status for the selected campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: "var(--rk-text-muted)" }}>
                  <th className="pb-2">Contact</th>
                  <th className="pb-2">Company</th>
                  <th className="pb-2">Sent</th>
                  <th className="pb-2">Opened</th>
                  <th className="pb-2">Clicked</th>
                  <th className="pb-2">Last activity</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4" style={{ color: "var(--rk-text-muted)" }}>
                      No engagement yet. Send a campaign to populate this table.
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr
                      key={contact.contact_id}
                      className="border-t border-white/5"
                    >
                      <td className="py-3">
                        <div className="font-medium" style={{ color: "var(--rk-text)" }}>
                          {contact.name}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--rk-text-muted)" }}>
                          {contact.email}
                        </div>
                      </td>
                      <td className="py-3" style={{ color: "var(--rk-text-muted)" }}>
                        {contact.company ?? "—"}
                      </td>
                      <td className="py-3" style={{ color: "var(--rk-text)" }}>{contact.sent}</td>
                      <td className="py-3" style={{ color: "var(--rk-text)" }}>{contact.opened}</td>
                      <td className="py-3" style={{ color: "var(--rk-text)" }}>{contact.clicked}</td>
                      <td className="py-3" style={{ color: "var(--rk-text-muted)" }}>
                        {formatDate(contact.lastActivity)}
                      </td>
                      <td className="py-3">
                        <span
                          className="px-2 py-1 rounded-full text-[10px] uppercase"
                          style={{
                            background:
                              contact.status === "clicked"
                                ? "rgba(59,130,246,0.2)"
                                : contact.status === "opened"
                                ? "rgba(34,197,94,0.2)"
                                : contact.status === "sent"
                                ? "rgba(251,191,36,0.2)"
                                : contact.status === "failed"
                                ? "rgba(239,68,68,0.2)"
                                : "rgba(148,163,184,0.2)",
                            color:
                              contact.status === "clicked"
                                ? "#60a5fa"
                                : contact.status === "opened"
                                ? "#4ade80"
                                : contact.status === "sent"
                                ? "#fbbf24"
                                : contact.status === "failed"
                                ? "#f87171"
                                : "#cbd5f5",
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
    </div>
  );
}
