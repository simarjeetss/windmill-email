"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "analytics-warning-banner-dismissed";

export default function AnalyticsWarningBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage failures
    }
  };

  if (!mounted || dismissed) return null;

  return (
    <div
      className="sticky top-3 z-40 mb-4 px-4 py-3 rounded-lg flex items-start justify-between gap-3"
      style={{
        background: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.35)",
        color: "#f59e0b",
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
        style={{ background: "rgba(0,0,0,0.12)", color: "#f59e0b" }}
      >
        x
      </button>
    </div>
  );
}
