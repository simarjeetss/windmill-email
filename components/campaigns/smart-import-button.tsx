"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import { importContacts } from "@/lib/supabase/campaigns";
import { uploadCampaignFile } from "@/lib/supabase/campaign-files";
import { parseSpreadsheet, type RawSheet } from "@/lib/import/parse-spreadsheet";
import {
  autoMapColumns,
  applyMapping,
  type ColumnMapping,
  type ContactField,
} from "@/lib/import/column-mapper";

type Step = "idle" | "mapping" | "importing" | "done";

const CONTACT_FIELDS: { key: ContactField; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "full_name", label: "Full Name" },
  { key: "company", label: "Company" },
];

export default function SmartImportButton({ campaignId }: { campaignId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [sheet, setSheet] = useState<RawSheet | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    email: null,
    first_name: null,
    last_name: null,
    company: null,
    full_name: null,
  });
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetState = useCallback(() => {
    setStep("idle");
    setSheet(null);
    setRawFile(null);
    setMapping({ email: null, first_name: null, last_name: null, company: null, full_name: null });
    setResult(null);
    setError(null);
  }, []);

  /* ── Step 1: read & parse file ─────────────────────────────────────────── */

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    resetState();

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const sheets = parseSpreadsheet(buffer, file.name);
        if (sheets.length === 0) {
          setError("No data found in the file.");
          return;
        }
        // Use the first sheet with data
        const primary = sheets[0];
        setSheet(primary);
        setRawFile(file);

        // Auto-map columns
        const autoMap = autoMapColumns(primary.headers, primary.rows.slice(0, 20));
        setMapping(autoMap);
        setStep("mapping");
      } catch {
        setError("Could not parse this file. Make sure it's a valid Excel or CSV file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  /* ── Step 2: confirm mapping & import ──────────────────────────────────── */

  function handleImport() {
    if (!sheet || !mapping.email) return;

    setStep("importing");
    const contacts = applyMapping(sheet.rows, mapping);

    startTransition(async () => {
      // Import contacts
      const res = await importContacts(campaignId, contacts);
      if (res.error) {
        setError(res.error);
        setStep("mapping");
        return;
      }

      // Upload the source file alongside the import
      if (rawFile) {
        const fd = new FormData();
        fd.append("file", rawFile);
        fd.append("campaignId", campaignId);
        const uploadRes = await uploadCampaignFile(fd);
        if (uploadRes.error) {
          console.error("File upload failed:", uploadRes.error);
        }
      }

      setResult({ inserted: res.inserted, skipped: res.skipped });
      setStep("done");
    });
  }

  function updateMapping(field: ContactField, header: string | null) {
    setMapping((prev) => ({ ...prev, [field]: header }));
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  // The column mapping modal overlay
  if (step === "mapping" || step === "importing") {
    const preview = sheet ? sheet.rows.slice(0, 4) : [];
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => step !== "importing" && resetState()}
        />

        {/* Panel */}
        <div
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl p-6"
          style={{
            background: "var(--wm-surface)",
            border: "1px solid var(--wm-border-md)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3
                className="text-base font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
              >
                Map Columns
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--wm-text-sub)" }}>
                {sheet?.name} · {sheet?.rows.length} row{(sheet?.rows.length ?? 0) !== 1 ? "s" : ""} detected
              </p>
            </div>
            <button
              onClick={resetState}
              disabled={step === "importing"}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: "var(--wm-surface-2)",
                border: "1px solid var(--wm-border)",
                color: "var(--wm-text-sub)",
                cursor: step === "importing" ? "wait" : "pointer",
              }}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Mapping selectors */}
          <div className="space-y-3 mb-5">
            {CONTACT_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <span
                  className="text-xs font-medium w-24 shrink-0"
                  style={{ color: key === "email" ? "var(--wm-accent)" : "var(--wm-text-muted)" }}
                >
                  {label}
                  {key === "email" && <span className="text-red-400 ml-0.5">*</span>}
                </span>
                <select
                  value={mapping[key] ?? "__none__"}
                  onChange={(e) => updateMapping(key, e.target.value === "__none__" ? null : e.target.value)}
                  className="flex-1 text-xs rounded-lg px-3 py-2 transition-colors"
                  style={{
                    background: "var(--wm-surface-2)",
                    border: `1px solid ${mapping[key] ? "rgba(43,122,95,0.35)" : "var(--wm-border)"}`,
                    color: mapping[key] ? "var(--wm-text)" : "var(--wm-text-sub)",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="__none__">— skip —</option>
                  {sheet?.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Hint */}
          <p className="text-[11px] mb-4" style={{ color: "var(--wm-text-sub)" }}>
            💡 Use <strong>Full Name</strong> if your file has a single name column — it will be split into first & last automatically.
          </p>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--wm-text-sub)" }}>
                Preview
              </p>
              <div
                className="overflow-x-auto rounded-lg"
                style={{ border: "1px solid var(--wm-border)" }}
              >
                <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--wm-surface-2)" }}>
                      {sheet?.headers.map((h) => {
                        // Highlight mapped columns
                        const mappedTo = (Object.entries(mapping) as [ContactField, string | null][])
                          .find(([, v]) => v === h)?.[0];
                        return (
                          <th
                            key={h}
                            className="px-2.5 py-2 text-left font-medium whitespace-nowrap"
                            style={{
                              color: mappedTo ? "var(--wm-accent)" : "var(--wm-text-sub)",
                              borderBottom: "1px solid var(--wm-border)",
                              background: mappedTo ? "rgba(43,122,95,0.06)" : "transparent",
                            }}
                          >
                            {h}
                            {mappedTo && (
                              <span className="ml-1 text-[9px] opacity-70">→ {mappedTo}</span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {sheet?.headers.map((h) => (
                          <td
                            key={h}
                            className="px-2.5 py-1.5 whitespace-nowrap"
                            style={{
                              color: "var(--wm-text-muted)",
                              borderBottom: i < preview.length - 1 ? "1px solid var(--wm-border)" : "none",
                            }}
                          >
                            {row[h] || <span style={{ color: "var(--wm-text-sub)" }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs mb-3" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={resetState}
              disabled={step === "importing"}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: "var(--wm-surface-2)",
                border: "1px solid var(--wm-border)",
                color: "var(--wm-text-muted)",
                cursor: step === "importing" ? "wait" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!mapping.email || step === "importing"}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: mapping.email ? "var(--wm-accent)" : "var(--wm-surface-2)",
                border: "1px solid transparent",
                color: mapping.email ? "#fff" : "var(--wm-text-sub)",
                cursor: !mapping.email || step === "importing" ? "not-allowed" : "pointer",
                opacity: !mapping.email ? 0.5 : 1,
              }}
            >
              {step === "importing" ? "Importing…" : `Import ${sheet?.rows.length ?? 0} Contacts`}
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ── Default button state ──────────────────────────────────────────────── */

  return (
    <div className="flex flex-col items-end gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: "rgba(43,122,95,0.10)",
          border: "1px solid rgba(43,122,95,0.25)",
          color: "var(--wm-accent)",
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Smart Import
      </button>

      {step === "done" && result && (
        <span className="text-[11px]" style={{ color: "var(--wm-accent)" }}>
          ✓ {result.inserted} imported{result.skipped > 0 ? `, ${result.skipped} skipped` : ""}
        </span>
      )}
      {step === "idle" && error && (
        <span className="text-[11px]" style={{ color: "#f87171" }}>
          {error}
        </span>
      )}
    </div>
  );
}
