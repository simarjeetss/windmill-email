"use client";

import { useEffect, useState, useTransition } from "react";
import {
  cancelCampaignSendRun,
  getLatestCampaignSendRun,
  retryCampaignSendRun,
} from "@/lib/supabase/sent-emails";

type CampaignSendRun = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  total_count: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  created_at: string;
};

type Props = {
  campaignId: string;
  initialRun: CampaignSendRun | null;
};

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function statusLabel(status: CampaignSendRun["status"]): string {
  if (status === "queued") return "Queued";
  if (status === "running") return "Running";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return "Cancelled";
}

export default function SendRunStatus({ campaignId, initialRun }: Props) {
  const [run, setRun] = useState<CampaignSendRun | null>(initialRun);
  const [error, setError] = useState("");
  const [isRetrying, startRetry] = useTransition();
  const [isCancelling, startCancel] = useTransition();

  useEffect(() => {
    setRun(initialRun);
  }, [initialRun]);

  useEffect(() => {
    if (!run || TERMINAL_STATUSES.has(run.status)) return;
    let stopped = false;

    const refresh = async () => {
      if (stopped) return;
      const latest = await getLatestCampaignSendRun(campaignId);
      if (latest) setRun(latest as CampaignSendRun);
    };

    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 1200);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [campaignId, run]);

  if (!run) return null;

  const processed = run.sent_count + run.failed_count;
  const progress = run.total_count > 0 ? Math.round((processed / run.total_count) * 100) : 0;

  function handleRetry() {
    if (!run) return;
    const runToRetry = run;
    setError("");
    startRetry(async () => {
      const result = await retryCampaignSendRun(runToRetry.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.run) {
        setRun(result.run as CampaignSendRun);
      }
    });
  }

  function handleCancel() {
    if (!run) return;
    const runToCancel = run;
    setError("");
    startCancel(async () => {
      const result = await cancelCampaignSendRun(runToCancel.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.run) {
        setRun(result.run as CampaignSendRun);
      }
    });
  }

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--wm-text-sub)" }}>
            Background delivery
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--wm-text)" }}>
            {statusLabel(run.status)}
            {(run.status === "queued" || run.status === "running") && (
              <span
                className="inline-block ml-2 align-middle"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "9999px",
                  background: "var(--wm-accent)",
                  boxShadow: "0 0 0 0 rgba(43,122,95,0.55)",
                  animation: "rkPulse 1.4s ease-in-out infinite",
                }}
              />
            )}
          </div>
        </div>
        <div className="text-xs tabular-nums" style={{ color: "var(--wm-text-sub)" }}>
          {processed} / {run.total_count}
        </div>
      </div>

      <div
        className="h-2.5 w-full rounded-full overflow-hidden"
        style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
      >
        <div
          className="h-full"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background: "var(--wm-accent)",
            transition: "width 200ms ease",
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg px-3 py-2" style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--wm-text-sub)" }}>Sent</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--wm-text)" }}>{run.sent_count}</div>
        </div>
        <div className="rounded-lg px-3 py-2" style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--wm-text-sub)" }}>Failed</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: "#f87171" }}>{run.failed_count}</div>
        </div>
        <div className="rounded-lg px-3 py-2" style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--wm-text-sub)" }}>Remaining</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--wm-text)" }}>
            {Math.max(0, run.total_count - processed)}
          </div>
        </div>
      </div>

      {run.last_error && run.status === "failed" && (
        <div
          className="px-3 py-2 rounded-lg text-xs"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
          }}
        >
          {run.last_error}
        </div>
      )}

      {error && (
        <div
          className="px-3 py-2 rounded-lg text-xs"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      {run.status === "failed" && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: "rgba(43,122,95,0.1)",
            border: "1px solid rgba(43,122,95,0.3)",
            color: "var(--wm-accent)",
            cursor: isRetrying ? "not-allowed" : "pointer",
            opacity: isRetrying ? 0.7 : 1,
          }}
        >
          {isRetrying ? "Retrying..." : "Retry failed emails"}
        </button>
      )}

      {(run.status === "queued" || run.status === "running") && (
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171",
            cursor: isCancelling ? "not-allowed" : "pointer",
            opacity: isCancelling ? 0.7 : 1,
          }}
        >
          {isCancelling ? "Cancelling..." : "Cancel run"}
        </button>
      )}
    </div>
  );
}
