"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/dashboard/campaigns",
    label: "Campaigns",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/contacts",
    label: "Contacts",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function DashboardSidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col w-[220px] shrink-0"
      style={{
        background: "var(--rk-surface)",
        borderRight: "1px solid var(--rk-border)",
        minHeight: "100vh",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-6 h-16 shrink-0"
        style={{ borderBottom: "1px solid var(--rk-border)" }}
      >
        <Link href="/dashboard">
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
          >
            ReachKit<span style={{ color: "var(--rk-gold)" }}>.ai</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        <p
          className="px-3 mb-2 text-[10px] uppercase tracking-[0.15em] font-medium"
          style={{ color: "var(--rk-text-sub)" }}
        >
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer"
                style={{
                  background: isActive ? "var(--rk-gold-dim)" : "transparent",
                  color: isActive ? "var(--rk-gold-light)" : "var(--rk-text-muted)",
                  border: isActive
                    ? "1px solid rgba(212,168,83,0.2)"
                    : "1px solid transparent",
                  fontWeight: isActive ? "500" : "400",
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User strip */}
      <div
        className="px-4 py-4 mx-3 mb-4 rounded-lg"
        style={{
          background: "var(--rk-surface-2)",
          border: "1px solid var(--rk-border)",
        }}
      >
        <div
          className="text-xs font-medium truncate mb-0.5"
          style={{ color: "var(--rk-text)" }}
        >
          {user.email?.split("@")[0]}
        </div>
        <div className="text-[11px] truncate" style={{ color: "var(--rk-text-sub)" }}>
          {user.email}
        </div>
      </div>
    </aside>
  );
}
