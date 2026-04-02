"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/supabase/profile";

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
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
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

export default function DashboardSidebar({ user, profile }: { user: User; profile: UserProfile | null }) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col w-[220px] shrink-0"
      style={{
        background: "var(--wm-surface)",
        borderRight: "1px solid var(--wm-border)",
        minHeight: "100vh",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-6 h-16 shrink-0"
        style={{ borderBottom: "1px solid var(--wm-border)" }}
      >
        <Link href="/dashboard" className="flex items-center">
          {/* Mini turbine icon with spinning blades */}
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none" style={{ color: "var(--wm-accent)" }}>
            <line x1="24" y1="24" x2="24" y2="46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="24" cy="24" r="3" fill="currentColor" />
            <g className="windmill-blades">
              <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" />
              <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(120 24 24)" />
              <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(240 24 24)" />
            </g>
          </svg>
        </Link>
        <style jsx>{`
          .windmill-blades {
            transform-origin: 24px 24px;
            animation: spin-blades 4s linear infinite;
          }
          @keyframes spin-blades {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        <p
          className="px-3 mb-2 text-[10px] uppercase tracking-[0.15em] font-medium"
          style={{ color: "var(--wm-text-sub)" }}
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
                  background: isActive ? "var(--wm-accent-dim)" : "transparent",
                  color: isActive ? "var(--wm-accent)" : "var(--wm-text-muted)",
                  border: isActive
                    ? "1px solid rgba(43,122,95,0.18)"
                    : "1px solid transparent",
                  fontWeight: isActive ? "500" : "400",
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.55 }}>{item.icon}</span>
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
          background: "var(--wm-surface-2)",
          border: "1px solid var(--wm-border)",
        }}
      >
        <div
          className="text-xs font-medium truncate mb-0.5"
          style={{ color: "var(--wm-text)" }}
        >
          {profile?.full_name || user.email?.split("@")[0]}
        </div>
        <div className="text-[11px] truncate" style={{ color: "var(--wm-text-sub)" }}>
          {user.email}
        </div>
      </div>
    </aside>
  );
}
