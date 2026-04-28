"use client";

import { useState, useTransition, useMemo } from "react";
import { deleteContact, updateContact } from "@/lib/supabase/campaigns";
import type { Contact } from "@/lib/supabase/campaigns";

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

export default function ContactsTable({
  contacts,
  campaignId,
}: {
  contacts: Contact[];
  campaignId: string;
}) {
  const [query, setQuery]     = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage]       = useState(1);

  // Filter by search query across email, name, company
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").toLowerCase();
      return (
        c.email.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        (c.company ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamp page when filters change
  const safePage   = Math.min(page, totalPages);
  const slice      = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleQueryChange(val: string) {
    setQuery(val);
    setPage(1);
  }

  function handlePageSizeChange(val: number) {
    setPageSize(val);
    setPage(1);
  }

  // Empty state (no contacts at all)
  if (contacts.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 rounded-xl"
        style={{ background: "var(--wm-surface)", border: "1px dashed var(--wm-border-md)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="var(--wm-text-sub)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="mb-3">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p className="text-sm" style={{ color: "var(--wm-text-muted)" }}>No contacts yet</p>
        <p className="text-xs mt-1" style={{ color: "var(--wm-text-sub)" }}>Add contacts or import a CSV</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Toolbar: search + page-size ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--wm-text-sub)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search email, name, company…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="rk-auth-input"
            style={{ paddingLeft: "2rem", paddingTop: "0.45rem", paddingBottom: "0.45rem" }}
            aria-label="Search contacts"
          />
        </div>

        {/* Page-size selector */}
  <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto">
          <span className="text-[11px] uppercase tracking-widest" style={{ color: "var(--wm-text-sub)" }}>
            Show
          </span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--wm-border)" }}>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => handlePageSizeChange(n)}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{
                  background: pageSize === n ? "rgba(43,122,95,0.12)" : "var(--wm-surface)",
                  color:      pageSize === n ? "var(--wm-accent)"         : "var(--wm-text-muted)",
                  borderRight: n !== 100 ? "1px solid var(--wm-border)" : "none",
                  fontWeight:  pageSize === n ? 600 : 400,
                  cursor: "pointer",
                  border: "none",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <div
          className="rounded-xl overflow-hidden min-w-[520px]"
          style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
        >
          {/* Header */}
          <div
            className="grid grid-cols-[1fr_1fr_auto] gap-3 px-4 py-2.5 text-[10px] uppercase tracking-widest"
            style={{ borderBottom: "1px solid var(--wm-border)", color: "var(--wm-text-sub)" }}
          >
            <span>Email / Name</span>
            <span>Company</span>
            <span />
          </div>

          {/* Rows */}
          {slice.length > 0 ? (
            <div className="divide-y divide-[var(--wm-border)]">
              {slice.map((c) => (
                <ContactRow key={c.id} contact={c} campaignId={campaignId} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
                No contacts match <span style={{ color: "var(--wm-accent)" }}>&quot;{query}&quot;</span>
              </p>
              <button
                onClick={() => handleQueryChange("")}
                className="mt-2 text-xs underline"
                style={{ color: "var(--wm-text-sub)", background: "none", border: "none", cursor: "pointer" }}
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer: count + pagination ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        {/* Result count */}
        <p className="text-xs" style={{ color: "var(--wm-text-sub)" }}>
          {filtered.length === contacts.length
            ? `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`
            : `${filtered.length} of ${contacts.length} contacts`}
        </p>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* Prev */}
            <PagBtn onClick={() => setPage((p) => p - 1)} disabled={safePage === 1} aria-label="Previous page">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </PagBtn>

            {/* Page numbers */}
            {getPageNumbers(safePage, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs" style={{ color: "var(--wm-text-sub)" }}>…</span>
              ) : (
                <PagBtn
                  key={n}
                  onClick={() => setPage(n as number)}
                  active={safePage === n}
                  aria-label={`Page ${n}`}
                >
                  {n}
                </PagBtn>
              )
            )}

            {/* Next */}
            <PagBtn onClick={() => setPage((p) => p + 1)} disabled={safePage === totalPages} aria-label="Next page">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </PagBtn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pagination helpers ────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3)              pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2)      pages.push("…");
  pages.push(total);
  return pages;
}

function PagBtn({
  children, onClick, disabled, active, "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="min-w-[28px] h-7 px-1.5 rounded-md text-xs flex items-center justify-center transition-colors"
      style={{
        background:  active    ? "rgba(43,122,95,0.15)" : "transparent",
        color:       active    ? "var(--wm-accent)"        : disabled ? "var(--wm-text-sub)" : "var(--wm-text-muted)",
        border:      active    ? "1px solid rgba(43,122,95,0.35)" : "1px solid transparent",
        cursor:      disabled  ? "not-allowed" : "pointer",
        opacity:     disabled  ? 0.4 : 1,
        fontWeight:  active    ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

// ── Contact row ───────────────────────────────────────────────────────────────

function ContactRow({ contact: c, campaignId }: { contact: Contact; campaignId: string }) {
  const [isDeleting, startDeleting] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(c);
  const [draft, setDraft] = useState({
    email: c.email,
    first_name: c.first_name ?? "",
    last_name: c.last_name ?? "",
    company: c.company ?? "",
  });

  const isPending = isDeleting || isSaving;
  const fullName = [current.first_name, current.last_name].filter(Boolean).join(" ");

  function resetDraft() {
    setDraft({
      email: current.email,
      first_name: current.first_name ?? "",
      last_name: current.last_name ?? "",
      company: current.company ?? "",
    });
  }

  function beginEdit() {
    resetDraft();
    setError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    resetDraft();
    setError(null);
    setIsEditing(false);
  }

  function handleSave() {
    startSaving(async () => {
      const result = await updateContact(c.id, campaignId, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrent((prev) => ({
        ...prev,
        email: draft.email.trim().toLowerCase(),
        first_name: draft.first_name.trim() || null,
        last_name: draft.last_name.trim() || null,
        company: draft.company.trim() || null,
      }));
      setError(null);
      setIsEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(`Remove ${current.email}?`)) return;
    startDeleting(async () => {
      await deleteContact(c.id, campaignId);
    });
  }

  if (isEditing) {
    return (
      <div
        className="grid grid-cols-[1fr_1fr_auto] gap-3 items-start px-4 py-3 text-sm transition-colors"
        style={{ opacity: isPending ? 0.55 : 1 }}
      >
        <div className="min-w-0 space-y-1.5">
          <input
            value={draft.email}
            onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
            className="rk-auth-input"
            style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem", fontSize: "0.75rem" }}
            aria-label={`Email for ${current.email}`}
            disabled={isPending}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <input
              value={draft.first_name}
              onChange={(e) => setDraft((prev) => ({ ...prev, first_name: e.target.value }))}
              className="rk-auth-input"
              style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem", fontSize: "0.75rem" }}
              aria-label={`First name for ${current.email}`}
              placeholder="First"
              disabled={isPending}
            />
            <input
              value={draft.last_name}
              onChange={(e) => setDraft((prev) => ({ ...prev, last_name: e.target.value }))}
              className="rk-auth-input"
              style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem", fontSize: "0.75rem" }}
              aria-label={`Last name for ${current.email}`}
              placeholder="Last"
              disabled={isPending}
            />
          </div>
          {error && (
            <p className="text-[11px]" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}
        </div>

        <div>
          <input
            value={draft.company}
            onChange={(e) => setDraft((prev) => ({ ...prev, company: e.target.value }))}
            className="rk-auth-input"
            style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem", fontSize: "0.75rem" }}
            aria-label={`Company for ${current.email}`}
            placeholder="Company"
            disabled={isPending}
          />
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-2 py-1 rounded-md text-[11px] transition-colors"
            style={{
              background: "rgba(43,122,95,0.12)",
              color: "var(--wm-accent)",
              border: "1px solid rgba(43,122,95,0.25)",
              cursor: "pointer",
            }}
            aria-label={`Save ${current.email}`}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={cancelEdit}
            disabled={isPending}
            className="px-2 py-1 rounded-md text-[11px] transition-colors"
            style={{
              background: "transparent",
              color: "var(--wm-text-sub)",
              border: "1px solid var(--wm-border)",
              cursor: "pointer",
            }}
            aria-label={`Cancel editing ${current.email}`}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center px-4 py-3 text-sm transition-colors"
      style={{ opacity: isPending ? 0.4 : 1 }}
    >
      <div className="min-w-0">
        <div className="text-xs truncate" style={{ color: "var(--wm-text)" }}>{current.email}</div>
        {fullName && (
          <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--wm-text-muted)" }}>{fullName}</div>
        )}
      </div>
      <div className="text-xs truncate" style={{ color: "var(--wm-text-muted)" }}>
        {current.company ?? <span style={{ color: "var(--wm-text-sub)" }}>—</span>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={beginEdit}
          disabled={isPending}
          className="p-1.5 rounded-md transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--wm-text-sub)" }}
          title="Edit contact"
          aria-label="Edit contact"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-md transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--wm-text-sub)" }}
          title="Remove contact"
          aria-label="Remove contact"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
