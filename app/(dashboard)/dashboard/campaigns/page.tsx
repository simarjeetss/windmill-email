import { getCampaigns } from "@/lib/supabase/campaigns";
import Link from "next/link";

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  draft:     { bg: "rgba(255,255,255,0.04)", color: "var(--rk-text-muted)", border: "rgba(255,255,255,0.1)" },
  active:    { bg: "rgba(34,197,94,0.08)",   color: "#4ade80",              border: "rgba(34,197,94,0.2)"   },
  paused:    { bg: "rgba(251,146,60,0.08)",  color: "#fb923c",              border: "rgba(251,146,60,0.2)"  },
  completed: { bg: "rgba(99,102,241,0.08)",  color: "#818cf8",              border: "rgba(99,102,241,0.2)"  },
};

export default async function CampaignsPage() {
  const { data: campaigns, error } = await getCampaigns();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
  <div className="rk-fade-up flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1
            className="text-3xl font-medium mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
          >
            Campaigns
          </h1>
          <p className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
            {campaigns.length === 0
              ? "Create your first outreach campaign"
              : `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/dashboard/campaigns/new" className="w-full sm:w-auto">
          <button
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "var(--rk-gold)",
              color: "#0d0d0f",
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Campaign
          </button>
        </Link>
      </div>

      {error && (
        <div
          className="rk-fade-in mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        /* Empty state */
        <div
          className="rk-fade-up rk-delay-1 flex flex-col items-center justify-center py-24 rounded-xl"
          style={{ background: "var(--rk-surface)", border: "1px dashed var(--rk-border-md)" }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "var(--rk-gold-dim)", border: "1px solid rgba(212,168,83,0.2)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4a853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
          </div>
          <h3
            className="text-lg font-medium mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
          >
            No campaigns yet
          </h3>
          <p className="text-sm mb-6 text-center max-w-xs" style={{ color: "var(--rk-text-muted)" }}>
            Create a campaign to start organising your outreach contacts and emails.
          </p>
          <Link href="/dashboard/campaigns/new">
            <button
              className="px-5 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--rk-gold)", color: "#0d0d0f" }}
            >
              Create first campaign
            </button>
          </Link>
        </div>
      ) : (
        /* Campaign list */
        <div className="rk-fade-up rk-delay-1 space-y-2">
          {campaigns.map((c, i) => {
            const st = STATUS_STYLES[c.status] ?? STATUS_STYLES.draft;
            return (
              <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}>
                <div
                  className="flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all group"
                  style={{
                    background: "var(--rk-surface)",
                    border: "1px solid var(--rk-border)",
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  {/* Number */}
                  <div
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
                    style={{ background: "var(--rk-gold-dim)", color: "var(--rk-gold)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  {/* Name + desc */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium mb-0.5 truncate transition-colors group-hover:text-[var(--rk-gold-light)]"
                      style={{ color: "var(--rk-text)" }}
                    >
                      {c.name}
                    </div>
                    {c.description && (
                      <div className="text-xs truncate" style={{ color: "var(--rk-text-muted)" }}>
                        {c.description}
                      </div>
                    )}
                  </div>

                  {/* Contact count */}
                  <div className="shrink-0 text-center hidden sm:block">
                    <div
                      className="text-lg font-semibold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
                    >
                      {c.contact_count ?? 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--rk-text-sub)" }}>
                      contacts
                    </div>
                  </div>

                  {/* Status badge */}
                  <div
                    className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                  >
                    {c.status}
                  </div>

                  {/* Arrow */}
                  <svg
                    className="shrink-0 opacity-30 group-hover:opacity-70 transition-opacity"
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
