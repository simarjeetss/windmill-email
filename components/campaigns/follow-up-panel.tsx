"use client";

import {
  followUpSegmentLabel,
  type FollowUpSegment,
} from "@/lib/campaign-send/follow-up";
import type { FollowUpAudienceSummary } from "@/lib/campaign-send/service";

const FOLLOW_UP_SEGMENTS: Array<{
  value: FollowUpSegment;
  eyebrow: string;
  description: string;
  accent: string;
  accentBorder: string;
  glow: string;
}> = [
  {
    value: "failed",
    eyebrow: "Recovery",
    description: "People whose most recent campaign send failed.",
    accent: "#dc2626",
    accentBorder: "rgba(220,38,38,0.22)",
    glow: "rgba(220,38,38,0.12)",
  },
  {
    value: "opened",
    eyebrow: "Warm",
    description: "Recipients who opened but have not clicked yet.",
    accent: "#2563eb",
    accentBorder: "rgba(37,99,235,0.22)",
    glow: "rgba(37,99,235,0.12)",
  },
  {
    value: "clicked",
    eyebrow: "Hot",
    description: "Your most engaged recipients based on click activity.",
    accent: "#8b5cf6",
    accentBorder: "rgba(139,92,246,0.22)",
    glow: "rgba(139,92,246,0.12)",
  },
  {
    value: "sent_all",
    eyebrow: "Wide",
    description: "Every successful send, including people who opened or clicked.",
    accent: "var(--wm-accent)",
    accentBorder: "rgba(43,122,95,0.22)",
    glow: "rgba(43,122,95,0.1)",
  },
  {
    value: "sent_unengaged",
    eyebrow: "Nudge",
    description: "Successful sends with no open and no click yet.",
    accent: "#d97706",
    accentBorder: "rgba(217,119,6,0.22)",
    glow: "rgba(217,119,6,0.12)",
  },
];

type Props = {
  campaignId: string;
  initialSummary: FollowUpAudienceSummary;
  selectedSegment: FollowUpSegment | null;
  onPrepareSegment: (segment: FollowUpSegment) => void;
};

export default function FollowUpPanel({
  campaignId: _campaignId,
  initialSummary,
  selectedSegment,
  onPrepareSegment,
}: Props) {
  const counts: Record<FollowUpSegment, number> = {
    failed: initialSummary.failed.length,
    opened: initialSummary.opened.length,
    clicked: initialSummary.clicked.length,
    sent_all: initialSummary.sent_all.length,
    sent_unengaged: initialSummary.sent_unengaged.length,
    pending: initialSummary.pending.length,
  };

  return (
    <section className="rk-fade-up rk-delay-2 mb-8">
      <div
        className="relative overflow-hidden rounded-[28px] p-5 sm:p-6"
        style={{
          background:
            "linear-gradient(145deg, var(--wm-surface) 0%, color-mix(in srgb, var(--wm-surface) 84%, var(--wm-accent) 16%) 100%)",
          border: "1px solid var(--wm-border)",
          boxShadow: "0 22px 70px rgba(0,0,0,0.08)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(43,122,95,0.12), transparent 28%), radial-gradient(circle at bottom left, rgba(212,168,83,0.08), transparent 22%)",
          }}
        />

        <div className="relative space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-2xl">
              <div
                className="mb-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]"
                style={{
                  background: "rgba(212,168,83,0.1)",
                  border: "1px solid rgba(212,168,83,0.18)",
                  color: "#d4a853",
                }}
              >
                Campaign Analytics Follow-Ups
              </div>
              <h2
                className="text-xl sm:text-2xl font-medium"
                style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
              >
                Turn campaign engagement into the next send.
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--wm-text-muted)" }}>
                Pick an audience from your latest campaign outcomes, then jump straight into the composer with that follow-up segment preselected.
              </p>
            </div>

            <div
              className="rounded-2xl px-4 py-3 text-xs max-w-xs"
              style={{
                background: "var(--wm-surface-2)",
                border: "1px solid var(--wm-border)",
                color: "var(--wm-text-sub)",
              }}
            >
              Audience counts use each contact&apos;s latest campaign send, so a recent failure overrides an older open.
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-5 sm:grid-cols-2">
            {FOLLOW_UP_SEGMENTS.map((segment) => {
              const selected = selectedSegment === segment.value;
              const count = counts[segment.value];

              return (
                <article
                  key={segment.value}
                  className="relative overflow-hidden rounded-[24px] p-4 flex flex-col min-h-[220px]"
                  style={{
                    background: selected
                      ? `linear-gradient(180deg, ${segment.glow}, var(--wm-surface-2))`
                      : "var(--wm-surface-2)",
                    border: selected
                      ? `1px solid ${segment.accentBorder}`
                      : "1px solid var(--wm-border)",
                    boxShadow: selected ? `0 14px 40px ${segment.glow}` : "none",
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span
                      className="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em]"
                      style={{
                        background: selected ? segment.glow : "color-mix(in srgb, var(--wm-surface-2) 92%, white 8%)",
                        color: segment.accent,
                        border: `1px solid ${segment.accentBorder}`,
                      }}
                    >
                      {segment.eyebrow}
                    </span>
                    {selected && (
                      <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: segment.accent }}>
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="mb-2 text-3xl font-semibold tabular-nums" style={{ color: "var(--wm-text)" }}>
                    {count}
                  </div>

                  <h3
                    className="text-base font-medium mb-2"
                    style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
                  >
                    {followUpSegmentLabel(segment.value)}
                  </h3>

                  <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--wm-text-sub)" }}>
                    {segment.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => onPrepareSegment(segment.value)}
                    className="mt-5 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                    style={{
                      background: selected ? segment.accent : "var(--wm-surface)",
                      border: selected ? "1px solid transparent" : `1px solid ${segment.accentBorder}`,
                      color: selected ? "var(--wm-accent-text)" : segment.accent,
                      cursor: "pointer",
                    }}
                  >
                    {selected ? "Ready in composer" : "Prepare follow-up"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}