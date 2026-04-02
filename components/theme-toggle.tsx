"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200"
      style={{
        background: "var(--rk-surface-2)",
        border: "1px solid var(--rk-border-md)",
        color: "var(--rk-text-muted)",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "rgba(212,168,83,0.4)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--rk-gold)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "var(--rk-border-md)";
        (e.currentTarget as HTMLButtonElement).style.color =
          "var(--rk-text-muted)";
      }}
    >
      {/* Track */}
      <span
        className="relative inline-flex items-center shrink-0"
        style={{
          width: "32px",
          height: "18px",
          background: isDark
            ? "rgba(212,168,83,0.15)"
            : "rgba(212,168,83,0.35)",
          border: `1px solid ${isDark ? "rgba(212,168,83,0.25)" : "rgba(212,168,83,0.6)"}`,
          borderRadius: "9px",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        {/* Thumb */}
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: isDark ? "2px" : "14px",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: isDark ? "var(--rk-gold)" : "var(--rk-gold)",
            transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Icon inside thumb */}
          {isDark ? (
            <svg
              width="7"
              height="7"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ color: "#0d0d0f" }}
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z" />
            </svg>
          ) : (
            <svg
              width="7"
              height="7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ color: "#0d0d0f" }}
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </span>
      </span>

      <span style={{ userSelect: "none" }}>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
