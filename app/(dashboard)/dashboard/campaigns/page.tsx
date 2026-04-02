import { getCampaigns } from "@/lib/supabase/campaigns";
import Link from "next/link";

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  draft:     { bg: "rgba(100,116,139,0.08)", color: "var(--wm-text-muted)", border: "rgba(100,116,139,0.15)" },
  active:    { bg: "rgba(43,122,95,0.10)",   color: "var(--wm-accent)",      border: "rgba(43,122,95,0.22)"  },
  paused:    { bg: "rgba(217,119,6,0.08)",   color: "#d97706",               border: "rgba(217,119,6,0.2)"   },
  completed: { bg: "rgba(99,102,241,0.08)",  color: "#6366f1",               border: "rgba(99,102,241,0.2)"  },
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
            style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
          >
            Campaigns
          </h1>
          <p className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
            {campaigns.length === 0
              ? "Create your first outreach campaign"
              : `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/dashboard/campaigns/new" className="w-full sm:w-auto">
          <button
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "var(--wm-accent)",
              color: "var(--wm-accent-text)",
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
          style={{ background: "var(--wm-surface)", border: "1px dashed var(--wm-border-md)" }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "var(--wm-accent-dim)", border: "1px solid rgba(43,122,95,0.2)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--wm-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
          </div>
          <h3
            className="text-lg font-medium mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
          >
            No campaigns yet
          </h3>
          <p className="text-sm mb-6 text-center max-w-xs" style={{ color: "var(--wm-text-muted)" }}>
            Create a campaign to start organising your outreach contacts and emails.
          </p>
          <Link href="/dashboard/campaigns/new">
            <button
              className="px-5 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--wm-accent)", color: "var(--wm-accent-text)" }}
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
                    background: "var(--wm-surface)",
                    border: "1px solid var(--wm-border)",
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  {/* Number */}
                  <div
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
                    style={{ background: "var(--wm-accent-dim)", color: "var(--wm-accent)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  {/* Name + desc */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium mb-0.5 truncate transition-colors group-hover:text-[var(--wm-accent)]"
                      style={{ color: "var(--wm-text)" }}
                    >
                      {c.name}
                    </div>
                    {c.description && (
                      <div className="text-xs truncate" style={{ color: "var(--wm-text-muted)" }}>
                        {c.description}
                      </div>
                    )}
                  </div>

                  {/* Contact count */}
                  <div className="shrink-0 text-center hidden sm:block">
                    <div
                      className="text-lg font-semibold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
                    >
                      {c.contact_count ?? 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--wm-text-sub)" }}>
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
