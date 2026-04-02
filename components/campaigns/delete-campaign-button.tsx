"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCampaign } from "@/lib/supabase/campaigns";

export default function DeleteCampaignButton({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (
      !confirm(
        `Delete "${campaignName}"?\n\nThis will permanently remove the campaign and all its contacts.`
      )
    )
      return;

    startTransition(async () => {
      await deleteCampaign(campaignId);
      // deleteCampaign calls redirect, but if it doesn't (error), go back
      router.push("/dashboard/campaigns");
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: "transparent",
        border: "1px solid var(--rk-border)",
        color: "var(--rk-text-muted)",
        cursor: isPending ? "wait" : "pointer",
        opacity: isPending ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.3)";
        (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--rk-border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--rk-text-muted)";
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" /><path d="M14 11v6" />
        <path d="M9 6V4h6v2" />
      </svg>
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
