"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export type EmailLogEntry = {
  id: string;
  subject: string;
  body: string;
  recipientName: string;
  recipientEmail: string;
  recipientCompany: string | null;
  campaignName: string | null;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  sent:    { bg: "rgba(43,122,95,0.10)",   color: "var(--wm-accent)" },
  opened:  { bg: "rgba(59,130,246,0.10)",  color: "#3b82f6" },
  clicked: { bg: "rgba(139,92,246,0.10)",  color: "#8b5cf6" },
  failed:  { bg: "rgba(239,68,68,0.10)",   color: "#dc2626" },
  pending: { bg: "rgba(100,116,139,0.10)", color: "#64748b" },
};

function deriveDisplayStatus(entry: EmailLogEntry): string {
  if (entry.clickedAt) return "clicked";
  if (entry.openedAt) return "opened";
  return entry.status || "pending";
}

function formatTs(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/* ── Responsive Email Detail Dialog ─────────────────────────────── */

function EmailDetailDialog({
  entry,
  onClose,
}: {
  entry: EmailLogEntry;
  onClose: () => void;
}) {
  const displayStatus = deriveDisplayStatus(entry);
  const sty = STATUS_STYLES[displayStatus] ?? STATUS_STYLES.pending;

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const overlay = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      />

      {/* Dialog — slides up on mobile, centred on desktop */}
      <div
        className="relative w-full sm:w-[92%] sm:max-w-2xl flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--wm-surface)",
          border: "1px solid var(--wm-border-md)",
          maxHeight: "calc(100dvh - 2rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Close bar (always visible, never cut) ─── */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2 sm:px-6 sm:pt-5 sm:pb-3">
          <span
            className="text-[10px] uppercase tracking-[0.15em] font-semibold"
            style={{ color: "var(--wm-text-sub)" }}
          >
            Email details
          </span>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full flex items-center justify-center transition-all"
            style={{
              background: "var(--wm-surface-2)",
              color: "var(--wm-text-muted)",
              border: "1px solid var(--wm-border)",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ─── Subject banner — visually distinct ─── */}
        <div
          className="shrink-0 mx-4 sm:mx-5 mb-3 px-5 py-4 rounded-xl"
          style={{
            background: "var(--wm-accent-dim)",
            borderLeft: "3px solid var(--wm-accent)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-1.5"
            style={{ color: "var(--wm-accent)" }}
          >
            Subject
          </p>
          <h3
            className="text-sm sm:text-base font-semibold leading-snug"
            style={{ color: "var(--wm-text)", fontFamily: "var(--font-display)" }}
          >
            {entry.subject || "(no subject)"}
          </h3>
        </div>

        {/* ─── Recipient + meta — compact info strip ─── */}
        <div
          className="shrink-0 mx-4 sm:mx-5 mb-3 flex flex-col gap-3 px-4 py-3.5 rounded-xl text-xs"
          style={{
            background: "var(--wm-bg)",
            border: "1px solid var(--wm-border)",
          }}
        >
          {/* To line */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="shrink-0 text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "var(--wm-surface-2)", color: "var(--wm-text-sub)" }}
            >
              To
            </span>
            <span className="font-medium" style={{ color: "var(--wm-text)" }}>
              {entry.recipientName}
            </span>
            <span style={{ color: "var(--wm-text-sub)" }}>
              &lt;{entry.recipientEmail}&gt;
            </span>
          </div>

          {/* Meta chips row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status chip */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold"
              style={{ background: sty.bg, color: sty.color }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: sty.color }}
              />
              {displayStatus}
            </span>

            {/* Divider dot */}
            <span className="w-0.5 h-0.5 rounded-full" style={{ background: "var(--wm-text-sub)" }} />

            {/* Sent */}
            <span style={{ color: "var(--wm-text-muted)" }}>
              Sent {formatTs(entry.sentAt)}
            </span>

            {entry.openedAt && (
              <>
                <span className="w-0.5 h-0.5 rounded-full" style={{ background: "var(--wm-text-sub)" }} />
                <span style={{ color: "#3b82f6" }}>
                  Opened {formatTs(entry.openedAt)}
                </span>
              </>
            )}

            {entry.clickedAt && (
              <>
                <span className="w-0.5 h-0.5 rounded-full" style={{ background: "var(--wm-text-sub)" }} />
                <span style={{ color: "#8b5cf6" }}>
                  Clicked {formatTs(entry.clickedAt)}
                </span>
              </>
            )}
          </div>

          {/* Campaign / Company */}
          {(entry.campaignName || entry.recipientCompany) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1" style={{ borderTop: "1px solid var(--wm-border)" }}>
              {entry.campaignName && (
                <span style={{ color: "var(--wm-text-muted)" }}>
                  <span style={{ color: "var(--wm-text-sub)" }}>Campaign: </span>
                  {entry.campaignName}
                </span>
              )}
              {entry.recipientCompany && (
                <span style={{ color: "var(--wm-text-muted)" }}>
                  <span style={{ color: "var(--wm-text-sub)" }}>Company: </span>
                  {entry.recipientCompany}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ─── Email body — scrollable ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto mx-4 sm:mx-5 mb-4 sm:mb-5 px-5 py-4 rounded-xl"
          style={{
            background: "var(--wm-bg)",
            border: "1px solid var(--wm-border)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-3 pb-2"
            style={{ color: "var(--wm-text-sub)", borderBottom: "1px solid var(--wm-border)" }}
          >
            Email content
          </p>
          {entry.body ? (
            <div
              className="text-[13px] sm:text-sm leading-[1.8] whitespace-pre-wrap"
              style={{ color: "var(--wm-text-muted)" }}
            >
              {entry.body}
            </div>
          ) : (
            <p className="text-xs italic py-4 text-center" style={{ color: "var(--wm-text-sub)" }}>
              No email body recorded.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}

/* ── Main Email Log component ──────────────────────────────────── */

const PAGE_SIZE = 15;

export default function EmailLog({ entries }: { entries: EmailLogEntry[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<EmailLogEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = entries;

    if (statusFilter !== "all") {
      result = result.filter((e) => deriveDisplayStatus(e) === statusFilter);
    }

    if (q) {
      result = result.filter(
        (e) =>
          e.recipientName.toLowerCase().includes(q) ||
          e.recipientEmail.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          (e.campaignName ?? "").toLowerCase().includes(q) ||
          (e.recipientCompany ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    entries.forEach((e) => {
      const s = deriveDisplayStatus(e);
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [entries]);

  return (
    <div className="space-y-4">
      {/* Dialog */}
      {selectedEntry && (
        <EmailDetailDialog
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--wm-text-sub)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, email, subject…"
            className="w-full rounded-lg pl-9 pr-3 py-2 text-xs outline-none transition-colors"
            style={{
              background: "var(--wm-bg)",
              border: "1px solid var(--wm-border)",
              color: "var(--wm-text)",
              caretColor: "var(--wm-accent)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(43,122,95,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--wm-border)")}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", "sent", "opened", "clicked", "failed"].map((s) => {
            const count = statusCounts[s] ?? 0;
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(0); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-all"
                style={{
                  background: isActive ? "var(--wm-accent-dim)" : "transparent",
                  border: isActive
                    ? "1px solid rgba(43,122,95,0.25)"
                    : "1px solid var(--wm-border)",
                  color: isActive ? "var(--wm-accent)" : "var(--wm-text-muted)",
                  cursor: "pointer",
                }}
              >
                {s}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? "rgba(43,122,95,0.12)" : "var(--wm-surface-2)",
                    color: isActive ? "var(--wm-accent)" : "var(--wm-text-sub)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr
              className="text-left text-[11px] uppercase tracking-wider"
              style={{ color: "var(--wm-text-sub)" }}
            >
              <th className="pb-3 pr-4 font-medium">Recipient</th>
              <th className="pb-3 pr-4 font-medium">Subject</th>
              <th className="pb-3 pr-4 font-medium hidden md:table-cell">Campaign</th>
              <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Sent</th>
              <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Opened</th>
              <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Clicked</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center" style={{ color: "var(--wm-text-muted)" }}>
                  {entries.length === 0
                    ? "No emails sent yet. Send a campaign to see the log."
                    : "No emails match your search."}
                </td>
              </tr>
            ) : (
              paged.map((entry) => {
                const displayStatus = deriveDisplayStatus(entry);
                const statusStyle = STATUS_STYLES[displayStatus] ?? STATUS_STYLES.pending;
                return (
                  <tr
                    key={entry.id}
                    className="group cursor-pointer transition-colors"
                    style={{ borderTop: "1px solid var(--wm-border)" }}
                    onClick={() => setSelectedEntry(entry)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--wm-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Recipient */}
                    <td className="py-3 pr-4 max-w-[200px]">
                      <div
                        className="font-medium truncate"
                        style={{ color: "var(--wm-text)" }}
                      >
                        {entry.recipientName}
                      </div>
                      <div
                        className="text-[11px] truncate"
                        style={{ color: "var(--wm-text-muted)" }}
                      >
                        {entry.recipientEmail}
                      </div>
                      {entry.recipientCompany && (
                        <div
                          className="text-[10px] truncate mt-0.5"
                          style={{ color: "var(--wm-text-sub)" }}
                        >
                          {entry.recipientCompany}
                        </div>
                      )}
                    </td>

                    {/* Subject */}
                    <td className="py-3 pr-4 max-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate" style={{ color: "var(--wm-text)" }}>
                          {entry.subject || "—"}
                        </span>
                        {/* View icon hint */}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                          style={{ color: "var(--wm-text-sub)" }}
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </div>
                    </td>

                    {/* Campaign — hidden on mobile */}
                    <td
                      className="py-3 pr-4 max-w-[150px] truncate align-top hidden md:table-cell"
                      style={{ color: "var(--wm-text-muted)" }}
                    >
                      {entry.campaignName ?? "—"}
                    </td>

                    {/* Sent at — hidden on smallest screens */}
                    <td className="py-3 pr-4 whitespace-nowrap align-top hidden sm:table-cell" style={{ color: "var(--wm-text-muted)" }}>
                      {formatTs(entry.sentAt)}
                    </td>

                    {/* Opened at — hidden on tablet and below */}
                    <td className="py-3 pr-4 whitespace-nowrap align-top hidden lg:table-cell" style={{ color: entry.openedAt ? "#3b82f6" : "var(--wm-text-sub)" }}>
                      {formatTs(entry.openedAt)}
                    </td>

                    {/* Clicked at — hidden on tablet and below */}
                    <td className="py-3 pr-4 whitespace-nowrap align-top hidden lg:table-cell" style={{ color: entry.clickedAt ? "#8b5cf6" : "var(--wm-text-sub)" }}>
                      {formatTs(entry.clickedAt)}
                    </td>

                    {/* Status */}
                    <td className="py-3 align-top">
                      <span
                        className="px-2 py-1 rounded-full text-[10px] uppercase font-medium"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                        }}
                      >
                        {displayStatus}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px]" style={{ color: "var(--wm-text-sub)" }}>
            Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
              style={{
                background: "transparent",
                border: "1px solid var(--wm-border)",
                color: safePage === 0 ? "var(--wm-text-sub)" : "var(--wm-text-muted)",
                cursor: safePage === 0 ? "not-allowed" : "pointer",
                opacity: safePage === 0 ? 0.5 : 1,
              }}
            >
              ← Prev
            </button>
            <span className="text-[11px] px-2" style={{ color: "var(--wm-text-muted)" }}>
              {safePage + 1} / {totalPages}
            </span>
            <button
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
              style={{
                background: "transparent",
                border: "1px solid var(--wm-border)",
                color: safePage >= totalPages - 1 ? "var(--wm-text-sub)" : "var(--wm-text-muted)",
                cursor: safePage >= totalPages - 1 ? "not-allowed" : "pointer",
                opacity: safePage >= totalPages - 1 ? 0.5 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
