"use client";

import { useRef, useState, useTransition } from "react";
import { importContacts } from "@/lib/supabase/campaigns";

function parseCSV(text: string): { email: string; first_name?: string; last_name?: string; company?: string }[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  // Detect header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes("email") ||
    firstLine.includes("first") ||
    firstLine.includes("name") ||
    firstLine.includes("company");

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .map((line) => {
      // Handle quoted fields
      const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g) ?? [line];
      const clean = (s: string | undefined) => (s ?? "").replace(/^"|"$/g, "").trim();

      if (hasHeader) {
        // Map by header positions
        const headers = lines[0].toLowerCase().split(",").map((h) => h.replace(/^"|"$/g, "").trim());
        const emailIdx   = headers.findIndex((h) => h === "email");
        const firstIdx   = headers.findIndex((h) => h === "first_name" || h === "first name" || h === "firstname");
        const lastIdx    = headers.findIndex((h) => h === "last_name"  || h === "last name"  || h === "lastname");
        const companyIdx = headers.findIndex((h) => h === "company");

        return {
          email:      clean(cols[emailIdx   >= 0 ? emailIdx   : 0]),
          first_name: firstIdx   >= 0 ? clean(cols[firstIdx])   : undefined,
          last_name:  lastIdx    >= 0 ? clean(cols[lastIdx])    : undefined,
          company:    companyIdx >= 0 ? clean(cols[companyIdx]) : undefined,
        };
      } else {
        // Guess: first column = email, rest ignored
        return { email: clean(cols[0]) };
      }
    })
    .filter((r) => r.email);
}

export default function CsvImportButton({ campaignId }: { campaignId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);

      startTransition(async () => {
        const res = await importContacts(campaignId, rows);
        if (res.error) {
          setError(res.error);
        } else {
          setResult({ inserted: res.inserted, skipped: res.skipped });
        }
      });
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: "var(--rk-surface-2)",
          border: "1px solid var(--rk-border-md)",
          color: "var(--rk-text-muted)",
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {isPending ? "Importing…" : "Import CSV"}
      </button>

      {result && (
        <span className="text-[11px]" style={{ color: "#4ade80" }}>
          ✓ {result.inserted} imported{result.skipped > 0 ? `, ${result.skipped} skipped` : ""}
        </span>
      )}
      {error && (
        <span className="text-[11px]" style={{ color: "#f87171" }}>
          {error}
        </span>
      )}
    </div>
  );
}
