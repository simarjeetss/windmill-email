"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  getLatestCampaignSendJob,
  kickCampaignSendJob,
  type CampaignSendJobProgress,
} from "@/lib/supabase/sent-emails";

function pct(value: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusCopy(job: CampaignSendJobProgress | null): string {
  if (!job) return "No background send has started for this campaign yet.";
  switch (job.job.status) {
    case "queued":
      return "Your send has been queued and is waiting for the worker to begin.";
    case "running":
      return "Emails are being delivered in the background with controlled parallelism.";
    case "completed":
      return "The most recent background send finished successfully.";
    case "failed":
      return job.job.last_error || "The background send stopped with an error.";
    case "cancelled":
      return "This background send was cancelled.";
    default:
      return "Background send status unavailable.";
  }
}

function statusTone(status: CampaignSendJobProgress["job"]["status"] | "idle") {
  if (status === "running" || status === "queued") {
    return {
      bg: "rgba(43,122,95,0.08)",
      border: "1px solid rgba(43,122,95,0.2)",
      color: "var(--wm-accent)",
    };
  }
  if (status === "completed") {
    return {
      bg: "rgba(34,197,94,0.08)",
      border: "1px solid rgba(34,197,94,0.2)",
      color: "var(--wm-accent)",
    };
  }
  if (status === "failed") {
    return {
      bg: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.2)",
      color: "#f87171",
    };
  }
  return {
    bg: "var(--wm-surface)",
    border: "1px solid var(--wm-border)",
    color: "var(--wm-text-muted)",
  };
}

type SendEmailProgressStatus = "queued" | "processing" | "sent" | "failed";

type SentEmailRealtimeRow = {
  send_job_id: string | null;
  status: string | null;
};

function isSendEmailProgressStatus(value: string | null | undefined): value is SendEmailProgressStatus {
  return value === "queued" || value === "processing" || value === "sent" || value === "failed";
}

function adjustCount(progress: CampaignSendJobProgress, status: SendEmailProgressStatus, delta: 1 | -1) {
  if (status === "queued") progress.queued = Math.max(0, progress.queued + delta);
  if (status === "processing") progress.processing = Math.max(0, progress.processing + delta);
  if (status === "sent") progress.sent = Math.max(0, progress.sent + delta);
  if (status === "failed") progress.failed = Math.max(0, progress.failed + delta);
}

function applySentEmailRealtimeChange(
  current: CampaignSendJobProgress | null,
  oldRow: SentEmailRealtimeRow | null,
  newRow: SentEmailRealtimeRow | null
): CampaignSendJobProgress | null {
  if (!current) return current;

  const currentJobId = current.job.id;
  const touchesCurrentJob =
    oldRow?.send_job_id === currentJobId || newRow?.send_job_id === currentJobId;

  if (!touchesCurrentJob) return current;

  const next: CampaignSendJobProgress = {
    ...current,
    job: { ...current.job },
  };

  const oldStatus =
    oldRow?.send_job_id === currentJobId && isSendEmailProgressStatus(oldRow.status) ? oldRow.status : null;
  const newStatus =
    newRow?.send_job_id === currentJobId && isSendEmailProgressStatus(newRow.status) ? newRow.status : null;

  if (oldStatus) adjustCount(next, oldStatus, -1);
  if (newStatus) adjustCount(next, newStatus, 1);

  next.total = next.queued + next.processing + next.sent + next.failed;
  next.hasMore = next.queued > 0 || next.processing > 0;
  next.job.sent_count = next.sent;
  next.job.failed_count = next.failed;
  next.job.updated_at = new Date().toISOString();

  if (next.hasMore) {
    next.job.status = next.job.status === "queued" ? "queued" : "running";
    next.job.completed_at = null;
  } else {
    next.job.status = next.sent === 0 && next.failed > 0 ? "failed" : "completed";
    next.job.completed_at = next.job.completed_at ?? new Date().toISOString();
  }

  return next;
}

export default function SendJobSidebar({
  campaignId,
  initialSendJob,
}: {
  campaignId: string;
  initialSendJob: CampaignSendJobProgress | null;
}) {
  const [job, setJob] = useState<CampaignSendJobProgress | null>(initialSendJob);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabase = useMemo(() => createBrowserClient(), []);

  const refresh = useCallback(async (options?: { silent?: boolean; kickWorker?: boolean }) => {
    const silent = options?.silent ?? false;
    const kickWorker = options?.kickWorker ?? true;
    if (!silent) setIsRefreshing(true);
    try {
      const { data } = await getLatestCampaignSendJob(campaignId);
      setJob(data);
      if (kickWorker && data?.hasMore) {
        await kickCampaignSendJob(data.job.id);
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => {
    const channel = supabase
      .channel(`campaign-send-jobs:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "email_send_jobs",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          void refresh({ silent: true, kickWorker: false });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [campaignId, refresh, supabase]);

  useEffect(() => {
    const jobId = job?.job.id;
    if (!jobId) return;

    const channel = supabase
      .channel(`campaign-send-progress:${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sent_emails",
          filter: `send_job_id=eq.${jobId}`,
        },
        (payload) => {
          const oldRow = (payload.old ?? null) as SentEmailRealtimeRow | null;
          const newRow = (payload.new ?? null) as SentEmailRealtimeRow | null;
          setJob((current) => applySentEmailRealtimeChange(current, oldRow, newRow));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [job?.job.id, supabase]);

  const totals = useMemo(() => {
    if (!job) {
      return {
        completed: 0,
        progress: 0,
      };
    }
    const completed = job.sent + job.failed;
    return {
      completed,
      progress: pct(completed, job.total),
    };
  }, [job]);

  const tone = statusTone(job?.job.status ?? "idle");

  return (
    <aside className="lg:sticky lg:top-6">
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
            >
              Background Send
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--wm-text-sub)" }}>
              {statusCopy(job)}
            </p>
          </div>
          <button
            onClick={() => {
              void refresh();
            }}
            disabled={isRefreshing}
            className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg transition-all"
            style={{
              background: "var(--wm-surface-2)",
              border: "1px solid var(--wm-border)",
              color: "var(--wm-text-muted)",
              cursor: isRefreshing ? "wait" : "pointer",
              opacity: isRefreshing ? 0.7 : 1,
            }}
          >
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div
          className="rounded-xl px-3 py-2.5 text-xs font-medium capitalize"
          style={{ background: tone.bg, border: tone.border, color: tone.color }}
        >
          {job?.job.status ?? "idle"}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--wm-text-sub)" }}>
            <span>Progress</span>
            <span>{job ? `${totals.completed}/${job.total}` : "0/0"}</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${totals.progress}%`,
                background: "linear-gradient(90deg, rgba(43,122,95,0.9) 0%, rgba(212,168,83,0.9) 100%)",
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            ["Queued", job?.queued ?? 0],
            ["Processing", job?.processing ?? 0],
            ["Sent", job?.sent ?? 0],
            ["Failed", job?.failed ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl px-3 py-2.5"
              style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
            >
              <div className="text-lg font-semibold" style={{ color: "var(--wm-text)" }}>
                {value}
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--wm-text-sub)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <div
          className="rounded-xl px-3 py-3 text-xs space-y-1"
          style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
        >
          <div style={{ color: "var(--wm-text-muted)" }}>
            Started: <span style={{ color: "var(--wm-text)" }}>{formatTimestamp(job?.job.created_at ?? null)}</span>
          </div>
          <div style={{ color: "var(--wm-text-muted)" }}>
            Last claimed: <span style={{ color: "var(--wm-text)" }}>{formatTimestamp(job?.job.claimed_at ?? null)}</span>
          </div>
          <div style={{ color: "var(--wm-text-muted)" }}>
            Completed: <span style={{ color: "var(--wm-text)" }}>{formatTimestamp(job?.job.completed_at ?? null)}</span>
          </div>
          {job?.job.last_error && (
            <div style={{ color: "#f87171" }}>
              Error: {job.job.last_error}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
