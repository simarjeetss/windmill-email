"use client";

import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "analytics-warning-banner-dismissed";

function subscribe(): () => void {
  return () => {};
}

function getClientSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  // Hide on server render to avoid hydration mismatch for persisted dismissals.
  return true;
}

export default function AnalyticsWarningBanner() {
  const [dismissedInSession, setDismissedInSession] = useState(false);
  const dismissedFromStorage = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const dismissed = dismissedInSession || dismissedFromStorage;

  const close = () => {
    setDismissedInSession(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage failures
    }
  };

  if (dismissed) return null;

  return (
    <div
      className="sticky top-3 z-40 mb-4 px-4 py-3 rounded-lg flex items-start justify-between gap-3"
      style={{
        background: "var(--wm-surface)",
        border: "1px solid rgba(245,158,11,0.5)",
        color: "var(--wm-warning)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
      }}
    >
      <div className="text-xs sm:text-sm">
        <span className="font-semibold mr-1">Warning:</span>
        Opened numbers are estimates and may be inaccurate due to email client privacy/proxy behavior.
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Close warning"
        className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center"
        style={{
          background: "var(--wm-surface-2)",
          border: "1px solid var(--wm-border-md)",
          color: "var(--wm-warning)",
        }}
      >
        x
      </button>
    </div>
  );
}
