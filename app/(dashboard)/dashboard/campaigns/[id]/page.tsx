import { getCampaign, getContacts } from "@/lib/supabase/campaigns";
import { getProfile } from "@/lib/supabase/profile";
import { getCampaignStats } from "@/lib/supabase/sent-emails";
import { getCampaignFiles } from "@/lib/supabase/campaign-files";
import { notFound } from "next/navigation";
import Link from "next/link";
import CampaignStatusSelect from "@/components/campaigns/campaign-status-select";
import DeleteCampaignButton from "@/components/campaigns/delete-campaign-button";
import CampaignTabs from "@/components/campaigns/campaign-tabs";

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  draft:     { bg: "rgba(100,116,139,0.08)", color: "var(--wm-text-muted)", border: "rgba(100,116,139,0.15)" },
  active:    { bg: "rgba(43,122,95,0.10)",   color: "var(--wm-accent)",      border: "rgba(43,122,95,0.22)"  },
  paused:    { bg: "rgba(217,119,6,0.08)",   color: "#d97706",               border: "rgba(217,119,6,0.2)"   },
  completed: { bg: "rgba(99,102,241,0.08)",  color: "#6366f1",               border: "rgba(99,102,241,0.2)"  },
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    { data: campaign, error: cError },
    { data: contacts, error: ctError },
    { data: profile },
    stats,
    { data: files },
  ] = await Promise.all([getCampaign(id), getContacts(id), getProfile(), getCampaignStats(id), getCampaignFiles(id)]);

  if (cError || !campaign) notFound();

  const st = STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="rk-fade-up mb-8">
        <Link
          href="/dashboard/campaigns"
          className="flex items-center gap-1.5 text-xs mb-4 w-fit transition-colors"
          style={{ color: "var(--wm-text-muted)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All campaigns
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1
                className="text-3xl font-medium"
                style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
              >
                {campaign.name}
              </h1>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
              >
                {campaign.status}
              </span>
            </div>
            {campaign.description && (
              <p className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
                {campaign.description}
              </p>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 flex-wrap">
            <CampaignStatusSelect campaignId={id} currentStatus={campaign.status} />
            <DeleteCampaignButton campaignId={id} campaignName={campaign.name} />
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="rk-fade-up rk-delay-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Contacts",   value: contacts.length },
          { label: "Sent",       value: stats.sent },
          { label: "Opened",     value: stats.opened },
          { label: "Open Rate",  value: stats.openRate },
          { label: "Click Rate", value: stats.clickRate },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
          >
            <div
              className="text-2xl font-semibold mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
            >
              {s.value}
            </div>
            <div className="text-xs uppercase tracking-wider" style={{ color: "var(--wm-text-muted)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {ctError && (
        <div
          className="rk-fade-in mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          {ctError}
        </div>
      )}

      {/* Tab-based: Email Template (default) + Contacts */}
      <CampaignTabs
        campaignId={id}
        campaignName={campaign.name}
        campaignDescription={campaign.description}
        initialTemplate={null}
        contacts={contacts}
        initialProfile={profile}
        files={files}
      />
    </div>
  );
}
