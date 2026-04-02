"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCampaign } from "@/lib/supabase/campaigns";

const STATUS_OPTIONS = [
  { value: "draft",  label: "Draft",     desc: "Not yet live" },
  { value: "active", label: "Active",    desc: "Currently running" },
  { value: "paused", label: "Paused",    desc: "Temporarily stopped" },
];

export default function NewCampaignPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCampaign(formData);
      if (result?.error) setError(result.error);
      // On success createCampaign redirects, so nothing needed here
    });
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="rk-fade-up mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs mb-4 transition-colors"
          style={{ color: "var(--rk-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1
          className="text-3xl font-medium mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
        >
          New Campaign
        </h1>
        <p className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
          Give your outreach campaign a name and status
        </p>
      </div>

      {/* Form card */}
      <div
        className="rk-fade-up rk-delay-1 rounded-xl p-7"
        style={{ background: "var(--rk-surface)", border: "1px solid var(--rk-border)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs uppercase tracking-widest"
              style={{ color: "var(--rk-text-muted)" }}
            >
              Campaign Name <span style={{ color: "var(--rk-gold)" }}>*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Q2 SaaS Outreach"
              maxLength={100}
              className="rk-auth-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-xs uppercase tracking-widest"
              style={{ color: "var(--rk-text-muted)" }}
            >
              Description <span className="normal-case tracking-normal text-[11px]" style={{ color: "var(--rk-text-sub)" }}>(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="What is this campaign about?"
              maxLength={300}
              className="rk-auth-input resize-none"
              style={{ resize: "none" }}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label
              className="block text-xs uppercase tracking-widest"
              style={{ color: "var(--rk-text-muted)" }}
            >
              Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt, i) => (
                <label
                  key={opt.value}
                  className="relative flex flex-col items-center gap-1 p-3 rounded-lg cursor-pointer transition-all"
                  style={{ border: "1px solid var(--rk-border)", background: "var(--rk-surface-2)" }}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    defaultChecked={i === 0}
                    className="sr-only peer"
                  />
                  <span
                    className="text-sm font-medium peer-checked:text-[var(--rk-gold)]"
                    style={{ color: "var(--rk-text-muted)" }}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--rk-text-sub)" }}>
                    {opt.desc}
                  </span>
                  {/* checked ring via peer */}
                  <span
                    className="absolute inset-0 rounded-lg pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                    style={{ border: "1px solid rgba(212,168,83,0.4)", background: "rgba(212,168,83,0.05)" }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rk-fade-in px-4 py-3 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rk-btn-ghost"
              style={{ width: "auto", flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rk-btn-gold"
              style={{ width: "auto", flex: 2, opacity: isPending ? 0.7 : 1 }}
            >
              {isPending ? "Creating…" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
