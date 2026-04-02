"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { signout } from "@/lib/supabase/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/contacts", label: "Contacts" },
  { href: "/dashboard/analytics", label: "Analytics" },
];

export default function DashboardTopbar({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleSignOut() {
    startTransition(async () => {
      await signout();
    });
  }

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 shrink-0"
      style={{
        background: "var(--rk-surface)",
        borderBottom: "1px solid var(--rk-border)",
      }}
    >
      {/* Left — mobile menu + logo */}
      <div className="lg:hidden flex items-center gap-2">
  <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ border: "1px solid var(--rk-border)", color: "var(--rk-text)" }}
            aria-label="Open navigation"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </SheetTrigger>
          <SheetContent side="left" className="p-0" style={{ background: "var(--rk-surface)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--rk-border)" }}>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
              >
                ReachKit<span style={{ color: "var(--rk-gold)" }}>.ai</span>
              </span>
              <p className="text-xs mt-1" style={{ color: "var(--rk-text-muted)" }}>
                {user.email}
              </p>
            </div>
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{ color: "var(--rk-text)", border: "1px solid transparent" }}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <span
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
        >
          ReachKit<span style={{ color: "var(--rk-gold)" }}>.ai</span>
        </span>
      </div>

      {/* Left — desktop greeting */}
      <div className="hidden lg:block">
        <span className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
          Good day,{" "}
          <span style={{ color: "var(--rk-text)" }}>
            {user.email?.split("@")[0]}
          </span>
        </span>
      </div>

      {/* Right */}
  <div className="flex items-center gap-2 sm:gap-3">
        {/* Status badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            color: "#4ade80",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#4ade80" }}
          />
          Active
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Avatar */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold uppercase"
          style={{
            background: "var(--rk-gold-dim)",
            border: "1px solid rgba(212,168,83,0.3)",
            color: "var(--rk-gold)",
          }}
        >
          {user.email?.[0]}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{
            background: "transparent",
            border: "1px solid var(--rk-border)",
            color: "var(--rk-text-muted)",
            cursor: isPending ? "wait" : "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(239,68,68,0.3)";
            (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--rk-border)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--rk-text-muted)";
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
          <span className="hidden sm:inline">
            {isPending ? "Signing out…" : "Sign out"}
          </span>
        </button>
      </div>
    </header>
  );
}
