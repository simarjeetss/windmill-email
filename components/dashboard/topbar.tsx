"use client";

import { useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import UserPanel from "@/components/dashboard/user-panel";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/contacts", label: "Contacts" },
  { href: "/dashboard/analytics", label: "Analytics" },
];

export default function DashboardTopbar({ user }: { user: User }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 shrink-0"
      style={{
        background: "var(--wm-surface)",
        borderBottom: "1px solid var(--wm-border)",
      }}
    >
      {/* Left — mobile menu + logo */}
      <div className="lg:hidden flex items-center gap-2">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ border: "1px solid var(--wm-border)", color: "var(--wm-text)" }}
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
          <SheetContent side="left" className="p-0" style={{ background: "var(--wm-surface)" }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--wm-border)" }}>
              <svg width="24" height="24" viewBox="0 0 48 48" fill="none" style={{ color: "var(--wm-accent)" }}>
                <line x1="24" y1="24" x2="24" y2="46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="24" cy="24" r="3" fill="currentColor" />
                <g className="windmill-blades-mobile">
                  <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" />
                  <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(120 24 24)" />
                  <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(240 24 24)" />
                </g>
              </svg>
              <div>
                <p className="text-xs" style={{ color: "var(--wm-text-muted)" }}>
                  {user.email}
                </p>
              </div>
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
                    style={{ color: "var(--wm-text)", border: "1px solid transparent" }}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <Link href="/dashboard">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" style={{ color: "var(--wm-accent)" }}>
            <line x1="24" y1="24" x2="24" y2="46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="24" cy="24" r="3" fill="currentColor" />
            <g className="windmill-blades-mobile">
              <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" />
              <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(120 24 24)" />
              <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(240 24 24)" />
            </g>
          </svg>
        </Link>
        <style jsx>{`
          .windmill-blades-mobile {
            transform-origin: 24px 24px;
            animation: spin-blades-mobile 4s linear infinite;
          }
          @keyframes spin-blades-mobile {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* Left — desktop greeting */}
      <div className="hidden lg:block">
        <span className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
          Good day,{" "}
          <span style={{ color: "var(--wm-text)" }}>
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
            background: "var(--wm-accent-dim)",
            border: "1px solid rgba(43,122,95,0.18)",
            color: "var(--wm-accent)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--wm-accent)" }}
          />
          Active
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User panel (avatar + dropdown) */}
        <UserPanel user={user} />
      </div>
    </header>
  );
}
