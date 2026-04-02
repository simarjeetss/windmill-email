import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getCampaigns } from "@/lib/supabase/campaigns";
import { getOverviewStats, getRecentActivity } from "@/lib/supabase/analytics";

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  draft:     { bg: "rgba(100,116,139,0.08)", color: "var(--wm-text-muted)", border: "rgba(100,116,139,0.15)" },
  active:    { bg: "rgba(43,122,95,0.10)",   color: "var(--wm-accent)",      border: "rgba(43,122,95,0.22)"  },
  paused:    { bg: "rgba(217,119,6,0.08)",   color: "#d97706",               border: "rgba(217,119,6,0.2)"   },
  completed: { bg: "rgba(99,102,241,0.08)",  color: "#6366f1",               border: "rgba(99,102,241,0.2)"  },
};

const ACTIVITY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  clicked: { bg: "rgba(59,130,246,0.08)",  color: "#3b82f6", border: "rgba(59,130,246,0.2)"  },
  opened:  { bg: "rgba(43,122,95,0.10)",   color: "var(--wm-accent)", border: "rgba(43,122,95,0.22)"  },
  sent:    { bg: "rgba(217,119,6,0.08)",   color: "#d97706", border: "rgba(217,119,6,0.2)"   },
  failed:  { bg: "rgba(239,68,68,0.08)",   color: "#dc2626", border: "rgba(239,68,68,0.2)"   },
  pending: { bg: "rgba(100,116,139,0.08)", color: "#64748b", border: "rgba(100,116,139,0.15)" },
};

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: campaigns } = await getCampaigns();
  const stats = await getOverviewStats();
  const activity = await getRecentActivity(6);
  const totalContacts = campaigns.reduce((sum, c) => sum + (c.contact_count ?? 0), 0);
  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const recentCampaigns = campaigns.slice(0, 3);

  const statCards = [
    {
      label: "Campaigns",
      value: campaigns.length.toString(),
      sub: campaigns.length ? `${activeCount} active` : "No campaigns yet",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      color: "var(--wm-accent-dim)",
      iconColor: "var(--wm-accent)",
      href: "/dashboard/campaigns",
    },
    {
      label: "Contacts",
      value: totalContacts.toString(),
      sub: campaigns.length ? `Across ${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}` : "Import your first list",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      color: "rgba(99,102,241,0.08)",
      iconColor: "#6366f1",
      href: "/dashboard/contacts",
    },
    {
      label: "Emails Sent",
      value: stats.sent.toString(),
      sub: stats.sent ? `${stats.opened} est. opens · ${stats.clicked} clicks` : "Ready to send",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
      color: "rgba(5,150,105,0.08)",
      iconColor: "#059669",
    },
    {
      label: "Open Rate (est.)",
      value: stats.openRate,
      sub: stats.clickRate === "—" ? "No activity yet" : `Click rate ${stats.clickRate}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      color: "rgba(14,165,233,0.08)",
      iconColor: "#0ea5e9",
      href: "/dashboard/analytics",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="rk-fade-up mb-8">
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
        >
          Overview
        </h1>
        <p className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
          Snapshot of your outreach performance · {user?.email}
        </p>
      </div>

      <div className="rk-fade-up rk-delay-1 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const content = (
            <div
              className="rounded-xl p-5 flex flex-col gap-3 transition-all group"
              style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: card.color, color: card.iconColor }}
              >
                {card.icon}
              </div>
              <div>
                <div
                  className="text-2xl font-semibold mb-0.5"
                  style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
                >
                  {card.value}
                </div>
                <div
                  className="text-xs font-medium mb-0.5 uppercase tracking-wider"
                  style={{ color: "var(--wm-text-muted)" }}
                >
                  {card.label}
                </div>
                <div className="text-[11px]" style={{ color: "var(--wm-text-sub)" }}>
                  {card.sub}
                </div>
              </div>
            </div>
          );

          return card.href ? (
            <Link key={card.label} href={card.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div
            className="rk-fade-up rk-delay-2 rounded-xl p-6"
            style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
              >
                Recent campaigns
              </h2>
              <Link href="/dashboard/campaigns" className="text-xs" style={{ color: "var(--wm-text-muted)" }}>
                View all →
              </Link>
            </div>
            {recentCampaigns.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
                Create a campaign to start tracking results.
              </div>
            ) : (
              <div className="space-y-2">
                {recentCampaigns.map((campaign) => {
                  const style = STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft;
                  return (
                    <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                        style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate" style={{ color: "var(--wm-text)" }}>
                            {campaign.name}
                          </div>
                          <div className="text-[11px]" style={{ color: "var(--wm-text-sub)" }}>
                            {campaign.contact_count ?? 0} contacts
                          </div>
                        </div>
                        <span
                          className="text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-medium"
                          style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
                        >
                          {campaign.status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="rk-fade-up rk-delay-3 rounded-xl p-6"
            style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
              >
                Recent activity
              </h2>
              <Link href="/dashboard/analytics" className="text-xs" style={{ color: "var(--wm-text-muted)" }}>
                View analytics →
              </Link>
            </div>
            {activity.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
                Send your first campaign to populate activity.
              </div>
            ) : (
              <div className="space-y-2">
                {activity.map((row) => {
                  const status = row.clicked_at
                    ? "clicked"
                    : row.opened_at
                    ? "opened"
                    : row.status === "failed"
                    ? "failed"
                    : row.status === "sent"
                    ? "sent"
                    : "pending";
                  const badge = ACTIVITY_STYLES[status] ?? ACTIVITY_STYLES.pending;
                  const displayName = row.contact_name ?? row.contact_email ?? "Unknown contact";
                  return (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg px-4 py-3"
                      style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate" style={{ color: "var(--wm-text)" }}>
                          {displayName}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--wm-text-sub)" }}>
                          {row.campaign_name ?? "Campaign"} · {formatTimestamp(row.sent_at)}
                        </div>
                      </div>
                      <span
                        className="text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-medium"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                      >
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rk-fade-up rk-delay-2 space-y-6">
          <div
            className="rounded-xl p-6"
            style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
          >
            <h2
              className="text-base font-semibold mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
            >
              Quick actions
            </h2>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard/campaigns/new" className="w-full">
                <button
                  className="rk-btn-gold w-full"
                  style={{ fontSize: "0.875rem" }}
                >
                  Create campaign
                </button>
              </Link>
              <Link href="/dashboard/campaigns" className="w-full">
                <button
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "transparent", border: "1px solid var(--wm-border)", color: "var(--wm-text)" }}
                >
                  Add contacts
                </button>
              </Link>
              <Link href="/dashboard/analytics" className="w-full">
                <button
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "transparent", border: "1px solid var(--wm-border)", color: "var(--wm-text)" }}
                >
                  View analytics
                </button>
              </Link>
            </div>
          </div>

          <div
            className="rounded-xl p-6"
            style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
          >
            <h2
              className="text-base font-semibold mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
            >
              Engagement snapshot
            </h2>
            <div className="space-y-3">
              {[
                { label: "Open rate (est.)", value: stats.openRate },
                { label: "Click rate", value: stats.clickRate },
                { label: "Failed sends", value: stats.failed },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--wm-text-muted)" }}>{row.label}</span>
                  <span className="font-medium" style={{ color: "var(--wm-text)" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
