"use client";

import {
  followUpSegmentLabel,
  type FollowUpSegment,
} from "@/lib/campaign-send/follow-up";
import type { FollowUpAudienceSummary } from "@/lib/campaign-send/service";

const SEGMENTS: Array<{
  value: FollowUpSegment;
  eyebrow: string;
  description: string;
  color: string;
  dimColor: string;
  borderColor: string;
}> = [
  {
    value: "failed",
    eyebrow: "Recovery",
    description: "Most recent send failed — resend to recover these contacts.",
    color: "#dc2626",
    dimColor: "rgba(220,38,38,0.08)",
    borderColor: "rgba(220,38,38,0.28)",
  },
  {
    value: "opened",
    eyebrow: "Warm",
    description: "Opened your email but haven't clicked a link yet.",
    color: "#2563eb",
    dimColor: "rgba(37,99,235,0.08)",
    borderColor: "rgba(37,99,235,0.28)",
  },
  {
    value: "clicked",
    eyebrow: "Hot",
    description: "Highest intent — clicked at least one link inside your campaign.",
    color: "#8b5cf6",
    dimColor: "rgba(139,92,246,0.08)",
    borderColor: "rgba(139,92,246,0.28)",
  },
  {
    value: "sent_all",
    eyebrow: "Wide",
    description: "Everyone reached successfully — opened, clicked, or just delivered.",
    color: "#2b7a5f",
    dimColor: "rgba(43,122,95,0.08)",
    borderColor: "rgba(43,122,95,0.28)",
  },
  {
    value: "sent_unengaged",
    eyebrow: "Nudge",
    description: "Delivered successfully but no open or click recorded yet.",
    color: "#d97706",
    dimColor: "rgba(217,119,6,0.08)",
    borderColor: "rgba(217,119,6,0.28)",
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

  const maxCount = Math.max(...SEGMENTS.map((s) => counts[s.value]), 1);
  const totalSent = counts.sent_all;

  return (
    <section className="rk-fade-up rk-delay-2 mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-medium"
            style={{ color: "var(--wm-accent)" }}
          >
            <span
              className="inline-block h-px w-5 rounded-full"
              style={{ background: "var(--wm-accent)", opacity: 0.55 }}
            />
            Follow-up Audiences
          </div>
          {totalSent > 0 && (
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
              style={{
                background: "var(--wm-surface-2)",
                border: "1px solid var(--wm-border)",
                color: "var(--wm-text-muted)",
              }}
            >
              <span
                className="tabular-nums font-semibold"
                style={{ color: "var(--wm-text)" }}
              >
                {totalSent.toLocaleString()}
              </span>
              <span>reached in last campaign</span>
            </div>
          )}
        </div>
      </div>

      {/* Segment rows */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          border: "1px solid var(--wm-border)",
          background: "var(--wm-surface)",
        }}
      >
        {SEGMENTS.map((seg, i) => {
          const count = counts[seg.value];
          const isSelected = selectedSegment === seg.value;
          const isEmpty = count === 0;
          const barWidth = isEmpty ? 0 : (count / maxCount) * 100;

          return (
            <div
              key={seg.value}
              role={isEmpty ? undefined : "button"}
              tabIndex={isEmpty ? undefined : 0}
              onKeyDown={
                isEmpty
                  ? undefined
                  : (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onPrepareSegment(seg.value);
                      }
                    }
              }
              onClick={isEmpty ? undefined : () => onPrepareSegment(seg.value)}
              className="group relative flex items-center gap-4 px-5 py-4 transition-colors duration-150"
              style={{
                borderTop: i > 0 ? "1px solid var(--wm-border)" : "none",
                borderLeft: `3px solid ${isSelected ? seg.color : "transparent"}`,
                background: isSelected ? seg.dimColor : "transparent",
                cursor: isEmpty ? "default" : "pointer",
                opacity: isEmpty ? 0.4 : 1,
              }}
            >
              {/* Hover layer */}
              {!isEmpty && !isSelected && (
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ background: seg.dimColor }}
                />
              )}

              {/* Count column */}
              <div
                className="relative w-12 shrink-0 text-right"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span
                  className="text-2xl font-bold tabular-nums leading-none"
                  style={{
                    color: isSelected ? seg.color : "var(--wm-text)",
                    transition: "color 0.15s",
                  }}
                >
                  {count.toLocaleString()}
                </span>
              </div>

              {/* Divider */}
              <div
                className="shrink-0 w-px self-stretch"
                style={{ background: "var(--wm-border)" }}
              />

              {/* Label + bar + description */}
              <div className="relative flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] font-semibold leading-none"
                    style={{
                      background: isSelected ? `${seg.color}18` : "var(--wm-surface-2)",
                      color: seg.color,
                      border: `1px solid ${seg.borderColor}`,
                    }}
                  >
                    {seg.eyebrow}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--wm-text)",
                    }}
                  >
                    {followUpSegmentLabel(seg.value)}
                  </span>
                </div>

                <p
                  className="text-xs leading-snug"
                  style={{ color: "var(--wm-text-sub)" }}
                >
                  {seg.description}
                </p>

                {/* Proportion bar */}
                <div
                  className="h-0.5 rounded-full overflow-hidden"
                  style={{ background: "var(--wm-border)", maxWidth: 180 }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${barWidth}%`,
                      background: isSelected ? seg.color : `${seg.color}70`,
                      transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  />
                </div>
              </div>

              {/* Action */}
              <div className="relative shrink-0 flex items-center">
                {isSelected ? (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold"
                    style={{
                      background: seg.color,
                      color: "#fff",
                    }}
                  >
                    <CheckIcon />
                    In composer
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isEmpty}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium transition-all duration-150"
                    style={{
                      background: "var(--wm-surface-2)",
                      border: `1px solid ${seg.borderColor}`,
                      color: seg.color,
                      cursor: isEmpty ? "not-allowed" : "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEmpty) onPrepareSegment(seg.value);
                    }}
                  >
                    Use audience
                    <ArrowRightIcon />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p
        className="mt-2.5 text-[11px] leading-relaxed pl-1"
        style={{ color: "var(--wm-text-sub)" }}
      >
        Counts reflect each contact&apos;s most recent interaction — a failed send overrides an older open.
      </p>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5 5.5l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5 5.5h8M6.5 2l3.5 3.5L6.5 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}