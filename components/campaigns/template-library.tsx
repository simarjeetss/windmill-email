"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { getAllTemplates, deleteTemplate } from "@/lib/supabase/email-templates";
import type { EmailTemplate } from "@/lib/supabase/email-templates";

interface TemplateLibraryProps {
  onLoad: (subject: string, body: string) => void;
}

export default function TemplateLibrary({ onLoad }: TemplateLibraryProps) {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState("");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [, startDelete]           = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    getAllTemplates().then(({ data, error: err }) => {
      setLoading(false);
      if (err) { setError(err); return; }
      setTemplates(data);
    });
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 60);
  }, [open]);

  const openLibrary  = useCallback(() => { setQuery(""); setActiveIdx(0); setOpen(true); }, []);
  const closeLibrary = useCallback(() => setOpen(false), []);

  const filtered = templates.filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q)
    );
  });

  function handleLoad(t: EmailTemplate) {
    onLoad(t.subject, t.body);
    closeLibrary();
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    startDelete(async () => {
      const { error: err } = await deleteTemplate(id);
      if (!err) setTemplates((prev) => prev.filter((t) => t.id !== id));
    });
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { closeLibrary(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[activeIdx]) handleLoad(filtered[activeIdx]);
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  useEffect(() => setActiveIdx(0), [query]);

  return (
    <>
      <button
        onClick={openLibrary}
        aria-label="Open template library"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: "var(--rk-surface)",
          border: "1px solid var(--rk-border)",
          color: "var(--rk-text-muted)",
          cursor: "pointer",
        }}
      >
        <LibraryIcon />
        Templates
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeLibrary(); }}
        >
          <div
            className="rk-fade-up w-full sm:max-w-xl mx-4 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "var(--rk-surface, #141417)",
              border: "1px solid rgba(212,168,83,0.2)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
              maxHeight: "72vh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 pt-4 pb-3"
              style={{ borderBottom: "1px solid var(--rk-border)" }}
            >
              <LibraryIcon gold />
              <span
                className="text-sm font-semibold flex-1"
                style={{ color: "var(--rk-text)", fontFamily: "var(--font-display, serif)" }}
              >
                Template Library
              </span>
              <span className="text-[10px]" style={{ color: "var(--rk-text-sub)" }}>
                {templates.length} template{templates.length !== 1 ? "s" : ""}
              </span>
              <kbd
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--rk-border)",
                  color: "var(--rk-text-sub)",
                  fontFamily: "monospace",
                }}
              >
                Esc
              </kbd>
            </div>

            {/* Search */}
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ borderBottom: "1px solid var(--rk-border)" }}
            >
              <SearchIcon />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by name, subject, or body…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--rk-text)", caretColor: "var(--rk-gold)" }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  style={{ background: "none", border: "none", color: "var(--rk-text-sub)", cursor: "pointer", padding: 0 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* List */}
            <div ref={listRef} className="overflow-y-auto flex-1">
              {loading && (
                <div className="flex items-center justify-center py-12 gap-2" style={{ color: "var(--rk-text-sub)" }}>
                  <SpinnerIcon />
                  <span className="text-sm">Loading templates…</span>
                </div>
              )}

              {!loading && error && (
                <div className="px-4 py-6 text-center text-sm" style={{ color: "#f87171" }}>{error}</div>
              )}

              {!loading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(212,168,83,0.06)", border: "1px solid rgba(212,168,83,0.15)" }}
                  >
                    <LibraryIcon gold />
                  </div>
                  <p className="text-sm" style={{ color: "var(--rk-text-sub)", fontStyle: "italic" }}>
                    {query ? "No templates match your search" : "No saved templates yet"}
                  </p>
                  {!query && (
                    <p className="text-xs text-center max-w-xs" style={{ color: "var(--rk-text-sub)" }}>
                      Click <strong style={{ color: "var(--rk-text-muted)" }}>"Save template"</strong> after composing an email to add it here.
                    </p>
                  )}
                </div>
              )}

              {!loading && !error && filtered.length > 0 && (
                <div className="p-2 space-y-1">
                  {filtered.map((t, i) => (
                    <div
                      key={t.id}
                      data-idx={i}
                      onMouseEnter={() => setActiveIdx(i)}
                      className="group relative rounded-xl transition-all"
                      style={{
                        background: activeIdx === i ? "rgba(212,168,83,0.08)" : "transparent",
                        border: activeIdx === i ? "1px solid rgba(212,168,83,0.2)" : "1px solid transparent",
                      }}
                    >
                      <button
                        onClick={() => handleLoad(t)}
                        className="w-full text-left px-3 py-3 block"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "12px" }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 pr-6">
                          <span
                            className="text-sm font-semibold truncate"
                            style={{ color: activeIdx === i ? "var(--rk-gold)" : "var(--rk-text)" }}
                          >
                            {t.name}
                          </span>
                          <span className="text-[10px] shrink-0" style={{ color: "var(--rk-text-sub)" }}>
                            {formatDate(t.updated_at)}
                          </span>
                        </div>
                        <div className="text-xs mb-1 truncate pr-6" style={{ color: "var(--rk-text-muted)" }}>
                          {t.subject || <em style={{ opacity: 0.4 }}>No subject</em>}
                        </div>
                        <div className="text-xs leading-relaxed line-clamp-2 pr-6" style={{ color: "var(--rk-text-sub)" }}>
                          {t.body.slice(0, 120)}{t.body.length > 120 ? "…" : ""}
                        </div>
                        {activeIdx === i && (
                          <div className="mt-2">
                            <span className="text-[10px]" style={{ color: "var(--rk-gold)" }}>↵ Load into editor</span>
                          </div>
                        )}
                      </button>

                      {/* Delete — appears on hover */}
                      <button
                        onClick={(e) => handleDelete(e, t.id)}
                        title="Delete template"
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                        style={{
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.2)",
                          color: "#f87171",
                          cursor: "pointer",
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {filtered.length > 0 && (
              <div
                className="px-4 py-2.5 flex items-center gap-3"
                style={{ borderTop: "1px solid var(--rk-border)" }}
              >
                <span className="text-[10px]" style={{ color: "var(--rk-text-sub)" }}>
                  ↑↓ navigate · ↵ load · Esc dismiss
                </span>
                {query && (
                  <span className="text-[10px] ml-auto" style={{ color: "var(--rk-text-sub)" }}>
                    {filtered.length} of {templates.length}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7)  return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LibraryIcon({ gold }: { gold?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke={gold ? "var(--rk-gold)" : "currentColor"}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "var(--rk-text-sub)", flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
