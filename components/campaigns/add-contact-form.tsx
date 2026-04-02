"use client";

import { useState, useTransition } from "react";
import { addContact } from "@/lib/supabase/campaigns";

export default function AddContactForm({ campaignId }: { campaignId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await addContact(campaignId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        form.reset();
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--rk-surface)", border: "1px solid var(--rk-border)" }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-email"
            className="block text-xs uppercase tracking-widest"
            style={{ color: "var(--rk-text-muted)" }}
          >
            Email <span style={{ color: "var(--rk-gold)" }}>*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            placeholder="contact@company.com"
            className="rk-auth-input"
          />
        </div>

        {/* First / Last name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="contact-first"
              className="block text-xs uppercase tracking-widest"
              style={{ color: "var(--rk-text-muted)" }}
            >
              First name
            </label>
            <input
              id="contact-first"
              name="first_name"
              type="text"
              placeholder="Jane"
              className="rk-auth-input"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="contact-last"
              className="block text-xs uppercase tracking-widest"
              style={{ color: "var(--rk-text-muted)" }}
            >
              Last name
            </label>
            <input
              id="contact-last"
              name="last_name"
              type="text"
              placeholder="Smith"
              className="rk-auth-input"
            />
          </div>
        </div>

        {/* Company */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-company"
            className="block text-xs uppercase tracking-widest"
            style={{ color: "var(--rk-text-muted)" }}
          >
            Company
          </label>
          <input
            id="contact-company"
            name="company"
            type="text"
            placeholder="Acme Inc."
            className="rk-auth-input"
          />
        </div>

        {/* Error / success */}
        {error && (
          <div
            className="rk-fade-in px-3 py-2.5 rounded-lg text-xs"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className="rk-fade-in px-3 py-2.5 rounded-lg text-xs flex items-center gap-2"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Contact added
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rk-btn-gold"
          style={{ opacity: isPending ? 0.7 : 1 }}
        >
          {isPending ? "Adding…" : "Add Contact"}
        </button>
      </form>
    </div>
  );
}
