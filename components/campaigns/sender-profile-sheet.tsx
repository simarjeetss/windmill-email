"use client";

import { useState, useTransition, useEffect, cloneElement } from "react";
import { UserIcon, PencilIcon, CheckIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import type { UserProfile } from "@/lib/supabase/profile";
import { upsertProfile } from "@/lib/supabase/profile";

interface SenderProfileSheetProps {
  /** Current saved profile, passed down from a server component */
  profile: UserProfile | null;
  /** Called after a successful save so parent can update its state */
  onSaved?: (profile: UserProfile) => void;
  /** Optional custom trigger element — onClick will be injected */
  trigger?: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}

export default function SenderProfileSheet({
  profile,
  onSaved,
  trigger,
}: SenderProfileSheetProps) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sync with updated profile prop (e.g. after parent state changes)
  useEffect(() => {
    if (!open) {
      setFullName(profile?.full_name ?? "");
      setCompany(profile?.company ?? "");
      setError("");
      setSaved(false);
    }
  }, [profile, open]);

  function handleSave() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const { data, error: err } = await upsertProfile(fullName, company);
      if (err) { setError(err); return; }
      setSaved(true);
      if (data) onSaved?.(data);
      setTimeout(() => setOpen(false), 800);
    });
  }

  // Build the trigger — inject onClick to open the sheet
  const defaultTrigger = (
    <button
      className="flex items-center gap-1.5 text-xs transition-colors"
      style={{ color: "var(--rk-text-muted)" }}
    >
      <UserIcon size={12} />
      {profile?.full_name ? (
        <>
          <span style={{ color: "var(--rk-text)" }}>{profile.full_name}</span>
          <PencilIcon size={10} style={{ color: "var(--rk-text-sub)" }} />
        </>
      ) : (
        <span style={{ color: "var(--rk-gold)" }}>Set your name →</span>
      )}
    </button>
  );

  const triggerEl = trigger ?? defaultTrigger;
  const triggerWithHandler = cloneElement(triggerEl, {
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      triggerEl.props.onClick?.(e);
      setOpen(true);
    },
  });

  return (
    <>
      {triggerWithHandler}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col gap-0 p-0"
          style={{
            background: "var(--rk-surface)",
            borderLeft: "1px solid var(--rk-border)",
            color: "var(--rk-text)",
          }}
        >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid var(--rk-border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--rk-gold-dim)", border: "1px solid rgba(212,168,83,0.25)" }}
            >
              <UserIcon size={14} style={{ color: "var(--rk-gold)" }} />
            </div>
            <SheetTitle
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
            >
              Sender Profile
            </SheetTitle>
          </div>
          <SheetDescription style={{ color: "var(--rk-text-muted)" }}>
            Set your name and company once — they'll be used automatically as{" "}
            <code
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(212,168,83,0.08)",
                border: "1px solid rgba(212,168,83,0.2)",
                color: "var(--rk-gold)",
              }}
            >
              {"{{sender_name}}"}
            </code>{" "}
            and{" "}
            <code
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(212,168,83,0.08)",
                border: "1px solid rgba(212,168,83,0.2)",
                color: "var(--rk-gold)",
              }}
            >
              {"{{sender_company}}"}
            </code>{" "}
            in every email you write.
          </SheetDescription>
        </SheetHeader>

        {/* Form */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Full name */}
          <div className="space-y-1.5">
            <label
              htmlFor="sp-full-name"
              className="text-xs uppercase tracking-widest"
              style={{ color: "var(--rk-text-sub)" }}
            >
              Full Name <span style={{ color: "var(--rk-gold)" }}>*</span>
            </label>
            <input
              id="sp-full-name"
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(""); setSaved(false); }}
              placeholder="e.g. Alex Chen"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "var(--rk-bg)",
                border: "1px solid var(--rk-border)",
                color: "var(--rk-text)",
                caretColor: "var(--rk-gold)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,168,83,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--rk-border)")}
            />
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <label
              htmlFor="sp-company"
              className="text-xs uppercase tracking-widest"
              style={{ color: "var(--rk-text-sub)" }}
            >
              Company / Organisation
            </label>
            <input
              id="sp-company"
              type="text"
              value={company}
              onChange={(e) => { setCompany(e.target.value); setSaved(false); }}
              placeholder="e.g. Acme Inc."
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "var(--rk-bg)",
                border: "1px solid var(--rk-border)",
                color: "var(--rk-text)",
                caretColor: "var(--rk-gold)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,168,83,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--rk-border)")}
            />
          </div>

          {/* Preview */}
          {(fullName || company) && (
            <div
              className="rounded-lg px-4 py-3 space-y-1.5"
              style={{ background: "var(--rk-bg)", border: "1px solid var(--rk-border)" }}
            >
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--rk-text-sub)" }}>
                Preview in emails
              </p>
              {[
                ["{{sender_name}}", fullName || "—"],
                ["{{sender_company}}", company || "—"],
              ].map(([token, value]) => (
                <div key={token} className="flex items-center gap-2 text-xs">
                  <code
                    className="px-1.5 py-0.5 rounded text-[11px]"
                    style={{
                      background: "rgba(212,168,83,0.08)",
                      border: "1px solid rgba(212,168,83,0.15)",
                      color: "var(--rk-gold)",
                      fontFamily: "monospace",
                    }}
                  >
                    {token}
                  </code>
                  <span style={{ color: "var(--rk-text-sub)" }}>→</span>
                  <span style={{ color: "var(--rk-text-muted)" }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-4 py-3 text-xs"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <SheetFooter
          className="px-6 pb-6 pt-4 flex-row gap-2"
          style={{ borderTop: "1px solid var(--rk-border)" }}
        >
          <button
            onClick={handleSave}
            disabled={isPending || !fullName.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: saved
                ? "rgba(34,197,94,0.12)"
                : isPending || !fullName.trim()
                ? "rgba(212,168,83,0.06)"
                : "rgba(212,168,83,0.12)",
              border: saved
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid rgba(212,168,83,0.3)",
              color: saved ? "#4ade80" : "var(--rk-gold)",
              cursor: isPending || !fullName.trim() ? "not-allowed" : "pointer",
              opacity: isPending || !fullName.trim() ? 0.6 : 1,
            }}
          >
            {saved ? (
              <>
                <CheckIcon size={14} />
                Saved
              </>
            ) : isPending ? (
              <>
                <SpinnerIcon />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </button>
          <SheetClose
            render={
              <button
                className="px-4 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  background: "transparent",
                  border: "1px solid var(--rk-border)",
                  color: "var(--rk-text-muted)",
                  cursor: "pointer",
                }}
              />
            }
          >
            Cancel
          </SheetClose>
        </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
