"use client";

import { useTransition } from "react";
import { updateCampaignStatus } from "@/lib/supabase/campaigns";
import type { Campaign } from "@/lib/supabase/campaigns";

const STATUS_OPTIONS: { value: Campaign["status"]; label: string }[] = [
  { value: "draft",     label: "Draft"     },
  { value: "active",    label: "Active"    },
  { value: "paused",    label: "Paused"    },
  { value: "completed", label: "Completed" },
];

const STATUS_COLORS: Record<string, string> = {
  draft:     "var(--wm-text-muted)",
  active:    "var(--wm-accent)",
  paused:    "#d97706",
  completed: "#6366f1",
};

export default function CampaignStatusSelect({
  campaignId,
  currentStatus,
}: {
  campaignId: string;
  currentStatus: Campaign["status"];
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as Campaign["status"];
    startTransition(async () => {
      await updateCampaignStatus(campaignId, status);
    });
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs px-3 py-1.5 rounded-lg font-medium appearance-none cursor-pointer transition-all"
      style={{
        background: "var(--wm-surface-2)",
        border: "1px solid var(--wm-border-md)",
        color: STATUS_COLORS[currentStatus] ?? "var(--wm-text-muted)",
        outline: "none",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          style={{ background: "var(--wm-surface-2)", color: "var(--wm-text)" }}
        >
          {opt.label}
        </option>
      ))}
    </select>
  );
}
