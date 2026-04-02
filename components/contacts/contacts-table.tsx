"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { deleteContact } from "@/lib/supabase/campaigns";
import type { ContactWithCampaign } from "@/lib/supabase/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

export default function ContactsTable({ contacts }: { contacts: ContactWithCampaign[] }) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPending, startBulk] = useTransition();
  const [exportScope, setExportScope] = useState<"selected" | "filtered">("selected");

  const campaigns = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => {
      if (c.campaign_id) {
        map.set(c.campaign_id, c.campaign_name ?? "Untitled campaign");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (campaignFilter !== "all" && c.campaign_id !== campaignFilter) return false;
      if (!q) return true;
      const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").toLowerCase();
      return (
        c.email.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.campaign_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, query, campaignFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleQueryChange(val: string) {
    setQuery(val);
    setPage(1);
  }

  function handlePageSizeChange(val: number) {
    setPageSize(val);
    setPage(1);
  }

  function toggleSelectAll() {
    if (selectedIds.size === slice.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(slice.map((c) => c.id)));
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filtered.map((c) => c.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv(rows: ContactWithCampaign[]) {
    const header = ["email", "first_name", "last_name", "company", "campaign"].join(",");
    const lines = rows.map((c) => [
      c.email,
      c.first_name ?? "",
      c.last_name ?? "",
      c.company ?? "",
      c.campaign_name ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    const rows = exportScope === "selected"
      ? filtered.filter((c) => selectedIds.has(c.id))
      : filtered;
    exportCsv(rows);
  }

  function handleBulkDelete() {
    const rows = filtered.filter((c) => selectedIds.has(c.id));
    if (rows.length === 0) return;
    if (!confirm(`Delete ${rows.length} contact${rows.length !== 1 ? "s" : ""}?`)) return;
    startBulk(async () => {
      for (const row of rows) {
        await deleteContact(row.id, row.campaign_id);
      }
      setSelectedIds(new Set());
    });
  }

  if (contacts.length === 0) {
    return (
      <Card className="border-dashed" size="sm">
        <CardHeader>
          <CardTitle>No contacts yet</CardTitle>
          <CardDescription>Add contacts to a campaign to see them here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/campaigns">
            <Button size="sm">Go to campaigns</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="w-full lg:flex-1 min-w-[220px]">
          <Input
            type="search"
            placeholder="Search email, name, company, campaign…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            aria-label="Search contacts"
          />
        </div>

  <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest" style={{ color: "var(--rk-text-sub)" }}>
            Campaign
          </label>
          <select
            value={campaignFilter}
            onChange={(e) => { setCampaignFilter(e.target.value); setPage(1); setSelectedIds(new Set()); }}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            style={{ color: "var(--rk-text)" }}
            aria-label="Filter by campaign"
          >
            <option value="all">All</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

  <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-input px-1 py-0.5">
            <Button
              size="xs"
              variant={exportScope === "selected" ? "secondary" : "ghost"}
              onClick={() => setExportScope("selected")}
              disabled={selectedIds.size === 0}
            >
              Selected
            </Button>
            <Button
              size="xs"
              variant={exportScope === "filtered" ? "secondary" : "ghost"}
              onClick={() => setExportScope("filtered")}
            >
              Filtered
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || isBulkPending}
          >
            {isBulkPending ? "Deleting…" : `Delete (${selectedIds.size})`}
          </Button>
        </div>

  <div className="flex items-center gap-1.5 shrink-0 lg:ml-auto">
          <span className="text-[11px] uppercase tracking-widest" style={{ color: "var(--rk-text-sub)" }}>
            Show
          </span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--rk-border)" }}>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <Button
                key={n}
                size="xs"
                variant={pageSize === n ? "secondary" : "ghost"}
                onClick={() => handlePageSizeChange(n)}
                className="rounded-none"
              >
                {n}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-widest" style={{ color: "var(--rk-text-sub)" }}>
          Filters
        </span>
        <Button
          size="xs"
          variant={campaignFilter === "all" ? "secondary" : "ghost"}
          onClick={() => { setCampaignFilter("all"); setPage(1); clearSelection(); }}
        >
          All campaigns
        </Button>
        {campaigns.map((c) => (
          <Button
            key={c.id}
            size="xs"
            variant={campaignFilter === c.id ? "secondary" : "ghost"}
            onClick={() => { setCampaignFilter(c.id); setPage(1); clearSelection(); }}
          >
            {c.name}
          </Button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "var(--rk-surface)", border: "1px solid var(--rk-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--rk-text-sub)" }}>
            {selectedIds.size} selected
          </span>
          <Button size="xs" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
          {selectedIds.size < filtered.length && (
            <Button size="xs" variant="ghost" onClick={selectAllFiltered}>
              Select all {filtered.length}
            </Button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <div
          className="rounded-xl overflow-hidden min-w-[720px]"
          style={{ background: "var(--rk-surface)", border: "1px solid var(--rk-border)" }}
        >
          <div
            className="grid grid-cols-[auto_1.2fr_1fr_1fr_auto] gap-3 px-4 py-2.5 text-[10px] uppercase tracking-widest"
            style={{ borderBottom: "1px solid var(--rk-border)", color: "var(--rk-text-sub)" }}
          >
            <label className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={slice.length > 0 && selectedIds.size === slice.length}
                onChange={toggleSelectAll}
                aria-label="Select all contacts"
              />
            </label>
            <span>Email / Name</span>
            <span>Company</span>
            <span>Campaign</span>
            <span />
          </div>

          {slice.length > 0 ? (
            <div className="divide-y divide-[var(--rk-border)]">
              {slice.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  selected={selectedIds.has(c.id)}
                  onToggle={() => toggleSelect(c.id)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
                No contacts match <span style={{ color: "var(--rk-gold)" }}>&quot;{query}&quot;</span>
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => handleQueryChange("")}
                className="mt-1"
              >
                Clear search
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-xs" style={{ color: "var(--rk-text-sub)" }}>
          {filtered.length === contacts.length
            ? `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`
            : `${filtered.length} of ${contacts.length} contacts`}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <PagBtn onClick={() => setPage((p) => p - 1)} disabled={safePage === 1} aria-label="Previous page">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </PagBtn>

            {getPageNumbers(safePage, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs" style={{ color: "var(--rk-text-sub)" }}>…</span>
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

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i += 1) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function PagBtn({
  children,
  onClick,
  disabled,
  active,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Button
      size="icon-xs"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="min-w-[28px]"
      style={{
        background: active ? "rgba(212,168,83,0.15)" : "transparent",
        color: active ? "var(--rk-gold)" : disabled ? "var(--rk-text-sub)" : "var(--rk-text-muted)",
        border: active ? "1px solid rgba(212,168,83,0.35)" : "1px solid transparent",
      }}
    >
      {children}
    </Button>
  );
}

function ContactRow({
  contact,
  selected,
  onToggle,
}: {
  contact: ContactWithCampaign;
  selected: boolean;
  onToggle: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");

  function handleDelete() {
    if (!confirm(`Remove ${contact.email}?`)) return;
    startTransition(async () => {
      await deleteContact(contact.id, contact.campaign_id);
    });
  }

  return (
    <div
      className="grid grid-cols-[auto_1.2fr_1fr_1fr_auto] gap-3 items-center px-4 py-3 text-sm"
      style={{ color: "var(--rk-text)" }}
    >
      <label className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${contact.email}`}
        />
      </label>
      <div className="min-w-0">
        <div className="truncate" style={{ color: "var(--rk-text)" }}>
          {contact.email}
        </div>
        {fullName && (
          <div className="text-xs truncate" style={{ color: "var(--rk-text-muted)" }}>
            {fullName}
          </div>
        )}
      </div>

      <div className="truncate text-xs" style={{ color: "var(--rk-text-muted)" }}>
        {contact.company || "—"}
      </div>

      <div className="truncate text-xs" style={{ color: "var(--rk-text-muted)" }}>
        {contact.campaign_name ? (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/campaigns/${contact.campaign_id}`} className="hover:underline">
              {contact.campaign_name}
            </Link>
            <Link
              href={`/dashboard/campaigns/${contact.campaign_id}`}
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--rk-text-sub)" }}
            >
              Import
            </Link>
          </div>
        ) : (
          "Unknown campaign"
        )}
      </div>

      <Button
        size="icon-xs"
        variant="ghost"
        onClick={handleDelete}
        disabled={isPending}
        aria-label={`Delete ${contact.email}`}
        style={{ color: "var(--rk-text-sub)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </Button>
    </div>
  );
}
