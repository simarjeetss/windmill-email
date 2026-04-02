"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { signout } from "@/lib/supabase/actions";
import { getProfile, upsertProfile, type UserProfile } from "@/lib/supabase/profile";

export default function UserPanel({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Derive initials from profile name or email
  const displayName = profile?.full_name || user.email?.split("@")[0] || "U";
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.[0] ?? "U").toUpperCase();

  // Fetch profile on mount
  useEffect(() => {
    getProfile().then(({ data }) => {
      if (data) {
        setProfile(data);
        setFullName(data.full_name);
        setCompany(data.company);
      }
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setIsEditing(false);
        setSaveError(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setIsEditing(false);
        setSaveError(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleSave() {
    setSaveError(null);
    startTransition(async () => {
      const { data, error } = await upsertProfile(fullName, company);
      if (error) {
        setSaveError(error);
        return;
      }
      if (data) {
        setProfile(data);
        setFullName(data.full_name);
        setCompany(data.company);
      }
      setIsEditing(false);
    });
  }

  function handleSignOut() {
    startTransition(async () => {
      await signout();
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold uppercase transition-all duration-150"
        style={{
          background: "var(--wm-accent-dim)",
          border: open
            ? "1.5px solid var(--wm-accent)"
            : "1px solid rgba(43,122,95,0.2)",
          color: "var(--wm-accent)",
          cursor: "pointer",
        }}
        aria-label="Open user panel"
        aria-expanded={open}
      >
        {initials}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{
            background: "var(--wm-surface)",
            border: "1px solid var(--wm-border)",
            animation: "fadeInScale 150ms ease-out",
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid var(--wm-border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold uppercase shrink-0"
                style={{
                  background: "var(--wm-accent-dim)",
                  border: "1px solid rgba(43,122,95,0.2)",
                  color: "var(--wm-accent)",
                }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--wm-text)" }}
                >
                  {displayName}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--wm-text-muted)" }}
                >
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Profile info / Edit form */}
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--wm-border)" }}>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label
                    className="block text-[11px] uppercase tracking-wider font-medium mb-1"
                    style={{ color: "var(--wm-text-sub)" }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--wm-bg)",
                      border: "1px solid var(--wm-border)",
                      color: "var(--wm-text)",
                    }}
                    placeholder="Your name"
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    className="block text-[11px] uppercase tracking-wider font-medium mb-1"
                    style={{ color: "var(--wm-text-sub)" }}
                  >
                    Company
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--wm-bg)",
                      border: "1px solid var(--wm-border)",
                      color: "var(--wm-text)",
                    }}
                    placeholder="Company name"
                  />
                </div>
                {saveError && (
                  <p className="text-xs" style={{ color: "#ef4444" }}>
                    {saveError}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: "var(--wm-accent)",
                      color: "#fff",
                      cursor: isPending ? "wait" : "pointer",
                      opacity: isPending ? 0.7 : 1,
                    }}
                  >
                    {isPending ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSaveError(null);
                      setFullName(profile?.full_name ?? "");
                      setCompany(profile?.company ?? "");
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--wm-border)",
                      color: "var(--wm-text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {profile?.full_name && (
                  <div>
                    <p
                      className="text-[11px] uppercase tracking-wider font-medium"
                      style={{ color: "var(--wm-text-sub)" }}
                    >
                      Name
                    </p>
                    <p className="text-sm" style={{ color: "var(--wm-text)" }}>
                      {profile.full_name}
                    </p>
                  </div>
                )}
                {profile?.company && (
                  <div>
                    <p
                      className="text-[11px] uppercase tracking-wider font-medium"
                      style={{ color: "var(--wm-text-sub)" }}
                    >
                      Company
                    </p>
                    <p className="text-sm" style={{ color: "var(--wm-text)" }}>
                      {profile.company}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs transition-colors mt-1"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--wm-border)",
                    color: "var(--wm-text-muted)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--wm-accent-dim)";
                    e.currentTarget.style.borderColor = "rgba(43,122,95,0.18)";
                    e.currentTarget.style.color = "var(--wm-accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "var(--wm-border)";
                    e.currentTarget.style.color = "var(--wm-text-muted)";
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit profile
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-3 py-2">
            <button
              onClick={handleSignOut}
              disabled={isPending}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors"
              style={{
                background: "transparent",
                color: "var(--wm-text-muted)",
                cursor: isPending ? "wait" : "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                e.currentTarget.style.color = "#f87171";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--wm-text-muted)";
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {isPending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}

      {/* Keyframes for animation */}
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
