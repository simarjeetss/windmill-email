"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getCampaignFileUrl,
  deleteCampaignFile,
  type CampaignFile,
} from "@/lib/supabase/campaign-files";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(contentType: string) {
  if (contentType.includes("csv") || contentType.includes("text")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    );
  }
  // Excel / spreadsheet
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <rect x="8" y="12" width="8" height="6" rx="0.5" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="8" y1="15" x2="16" y2="15" />
    </svg>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({
  file,
  onClose,
}: {
  file: CampaignFile;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  // Fetch signed URL on mount
  useEffect(() => {
    (async () => {
      const res = await getCampaignFileUrl(file.storage_path);
      if (res.error || !res.url) {
        setError(res.error ?? "Could not load file.");
        setLoading(false);
        return;
      }
      setUrl(res.url);

      // For CSV/text files, fetch and parse for table preview
      const isText =
        file.content_type.includes("csv") ||
        file.content_type.includes("text") ||
        file.file_name.endsWith(".csv");

      const isExcel =
        file.content_type.includes("spreadsheet") ||
        file.content_type.includes("excel") ||
        file.file_name.endsWith(".xlsx") ||
        file.file_name.endsWith(".xls");

      if (isText) {
        try {
          const resp = await fetch(res.url);
          const text = await resp.text();
          const lines = text.trim().split(/\r?\n/);
          const headers = lines[0]?.split(",").map((h) => h.replace(/^"|"$/g, "").trim()) ?? [];
          const rows = lines.slice(1, 101).map((l) =>
            l.split(",").map((c) => c.replace(/^"|"$/g, "").trim())
          );
          setCsvData({ headers, rows });
        } catch {
          // Fall through — will show download link
        }
      } else if (isExcel) {
        try {
          const resp = await fetch(res.url);
          const buffer = await resp.arrayBuffer();
          // Dynamic import to avoid loading xlsx on every page
          const XLSX = await import("xlsx");
          const wb = XLSX.read(buffer, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          if (sheet) {
            const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
              defval: "",
              raw: false,
            });
            if (json.length > 0) {
              const headers = Object.keys(json[0]);
              const rows = json.slice(0, 100).map((row) =>
                headers.map((h) => String(row[h] ?? "").trim())
              );
              setCsvData({ headers, rows });
            }
          }
        } catch {
          // Fall through — will show download link
        }
      }

      setLoading(false);
    })();
  }, [file.storage_path, file.content_type, file.file_name]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[780px] max-h-[85vh] overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: "var(--wm-surface)",
          border: "1px solid var(--wm-border-md)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--wm-border)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div style={{ color: "var(--wm-accent)" }}>{fileIcon(file.content_type)}</div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
              >
                {file.file_name}
              </p>
              <p className="text-[11px]" style={{ color: "var(--wm-text-sub)" }}>
                {formatFileSize(file.file_size)} · {timeAgo(file.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                download={file.file_name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: "var(--wm-surface-2)",
                  border: "1px solid var(--wm-border)",
                  color: "var(--wm-text-muted)",
                  textDecoration: "none",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: "var(--wm-surface-2)",
                border: "1px solid var(--wm-border)",
                color: "var(--wm-text-sub)",
                cursor: "pointer",
              }}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm" style={{ color: "var(--wm-text-sub)" }}>Loading preview…</p>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
            </div>
          )}

          {!loading && !error && csvData && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--wm-text-sub)" }}>
                {csvData.rows.length} row{csvData.rows.length !== 1 ? "s" : ""} · {csvData.headers.length} column{csvData.headers.length !== 1 ? "s" : ""}
                {csvData.rows.length === 100 && " (first 100 shown)"}
              </p>
              <div
                className="overflow-x-auto rounded-lg"
                style={{ border: "1px solid var(--wm-border)" }}
              >
                <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--wm-surface-2)" }}>
                      <th
                        className="px-2.5 py-2 text-left font-medium"
                        style={{ color: "var(--wm-text-sub)", borderBottom: "1px solid var(--wm-border)", width: "36px" }}
                      >
                        #
                      </th>
                      {csvData.headers.map((h, i) => (
                        <th
                          key={i}
                          className="px-2.5 py-2 text-left font-medium whitespace-nowrap"
                          style={{ color: "var(--wm-text-muted)", borderBottom: "1px solid var(--wm-border)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.rows.map((row, ri) => (
                      <tr key={ri}>
                        <td
                          className="px-2.5 py-1.5 tabular-nums"
                          style={{
                            color: "var(--wm-text-sub)",
                            borderBottom: ri < csvData.rows.length - 1 ? "1px solid var(--wm-border)" : "none",
                          }}
                        >
                          {ri + 1}
                        </td>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-2.5 py-1.5 whitespace-nowrap max-w-[200px] truncate"
                            style={{
                              color: "var(--wm-text-muted)",
                              borderBottom: ri < csvData.rows.length - 1 ? "1px solid var(--wm-border)" : "none",
                            }}
                          >
                            {cell || <span style={{ color: "var(--wm-text-sub)" }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && !csvData && url && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm mb-3" style={{ color: "var(--wm-text-muted)" }}>
                Preview not available for this file type.
              </p>
              <a
                href={url}
                download={file.file_name}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: "var(--wm-accent)",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── File List ────────────────────────────────────────────────────────────────

export default function CampaignFileList({
  files,
  campaignId,
}: {
  files: CampaignFile[];
  campaignId: string;
}) {
  const [previewFile, setPreviewFile] = useState<CampaignFile | null>(null);

  if (files.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-14 rounded-xl"
        style={{ background: "var(--wm-surface)", border: "1px dashed var(--wm-border-md)" }}
      >
        <svg
          width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="var(--wm-text-sub)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="mb-3"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-sm" style={{ color: "var(--wm-text-muted)" }}>No files uploaded yet</p>
        <p className="text-xs mt-1" style={{ color: "var(--wm-text-sub)" }}>
          Files are saved automatically when you import contacts
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
      >
        <div className="divide-y divide-[var(--wm-border)]">
          {files.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              campaignId={campaignId}
              onPreview={() => setPreviewFile(f)}
            />
          ))}
        </div>
      </div>

      {previewFile && (
        <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </>
  );
}

// ─── Individual file row ──────────────────────────────────────────────────────

function FileRow({
  file,
  campaignId,
  onPreview,
}: {
  file: CampaignFile;
  campaignId: string;
  onPreview: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${file.file_name}"?`)) return;
    startTransition(async () => {
      await deleteCampaignFile(file.id, campaignId);
    });
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ opacity: isPending ? 0.4 : 1 }}
    >
      {/* Icon */}
      <div
        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(43,122,95,0.08)", color: "var(--wm-accent)" }}
      >
        {fileIcon(file.content_type)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: "var(--wm-text)" }}>
          {file.file_name}
        </p>
        <p className="text-[11px]" style={{ color: "var(--wm-text-sub)" }}>
          {formatFileSize(file.file_size)} · {timeAgo(file.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onPreview}
          className="p-1.5 rounded-md transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--wm-text-muted)" }}
          title="Preview file"
          aria-label="Preview file"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-md transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--wm-text-sub)" }}
          title="Delete file"
          aria-label="Delete file"
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
