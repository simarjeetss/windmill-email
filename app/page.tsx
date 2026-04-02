import Link from "next/link";

const METRICS = [
  { label: "Emails Sent",   value: "48,200+", desc: "Across all campaigns" },
  { label: "Open Rate",     value: "67.3%",   desc: "Industry avg: 21%" },
  { label: "Reply Rate",    value: "11.4%",   desc: "3× higher than cold" },
  { label: "Companies",     value: "2,100+",  desc: "Managed in platform" },
];

const FEATURES = [
  {
    title: "Bulk Import & Manage",
    desc: "Import thousands of companies and contacts from Excel. Filter, segment, and organize your outreach lists with ease.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    title: "Campaign Composer",
    desc: "Draft personalized emails with AI assistance. Use template variables for per-contact customization at scale.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    title: "Engagement Tracking",
    desc: "Real-time tracking of opens, clicks, and replies. Know exactly who engaged with every email you send.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    title: "Analytics Dashboard",
    desc: "Clear, actionable reporting on campaign performance. Spot trends, compare campaigns, and optimize your outreach.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

/* Wind turbine SVG icon — used decoratively */
function TurbineIcon({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      {/* Tower */}
      <line x1="24" y1="24" x2="24" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Hub */}
      <circle cx="24" cy="24" r="2.5" fill="currentColor" />
      {/* Blades */}
      <g className="wm-turbine-blades" style={{ transformOrigin: "24px 24px" }}>
        <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" />
        <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(120 24 24)" />
        <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(240 24 24)" />
      </g>
    </svg>
  );
}

export default function Home() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--wm-bg)", color: "var(--wm-text)", fontFamily: "var(--font-body)" }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="flex items-center justify-between px-6 sm:px-12 lg:px-20 h-16"
        style={{ borderBottom: "1px solid var(--wm-border)", background: "var(--wm-surface)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <TurbineIcon size={28} className="text-[var(--wm-accent)]" />
          {/* <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
          >
            s
          </span> */}
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-6 mr-4">
            <Link href="/pricing" className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
              Pricing
            </Link>
            <Link href="/blog" className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
              Blog
            </Link>
          </div>
          <Link href="/login" className="text-sm px-4 py-2 rounded-lg" style={{ color: "var(--wm-text-muted)" }}>
            Sign in
          </Link>
          <Link href="/signup">
            <button
              className="text-sm font-semibold px-5 py-2 rounded-lg"
              style={{ background: "var(--wm-accent)", color: "var(--wm-accent-text)", border: "none", cursor: "pointer" }}
            >
              Get started
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 sm:px-12 lg:px-20 pt-20 sm:pt-28 pb-16">
        {/* Subtle decorative grid */}
        <div
          aria-hidden
          className="absolute inset-0 wm-grid-bg pointer-events-none"
          style={{ opacity: 0.5 }}
        />

        {/* Decorative turbines — far right, very subtle */}
        <div aria-hidden className="absolute top-12 right-[8%] opacity-[0.05] hidden lg:block">
          <TurbineIcon size={180} />
        </div>
        <div aria-hidden className="absolute top-32 right-[18%] opacity-[0.03] hidden lg:block">
          <TurbineIcon size={120} />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-3xl">
          {/* Eyebrow */}
          <div className="rk-fade-up mb-6">
            <span
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
              style={{
                background: "var(--wm-accent-dim)",
                border: "1px solid rgba(43,122,95,0.15)",
                color: "var(--wm-accent)",
                letterSpacing: "0.04em",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--wm-accent)" }} />
              OUTREACH PLATFORM FOR WIND ENERGY
            </span>
          </div>

          <h1
            className="rk-fade-up rk-delay-1 mb-5"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "var(--wm-text)",
            }}
          >
            Manage contacts.
            <br />
            Send campaigns.
            <br />
            <span style={{ color: "var(--wm-accent)" }}>Track every open.</span>
          </h1>

          <p
            className="rk-fade-up rk-delay-2 mb-8 text-lg leading-relaxed"
            style={{ color: "var(--wm-text-muted)", maxWidth: "520px" }}
          >
            The email outreach platform built for B2B wind energy companies.
            Import your Excel data, run bulk campaigns, and track engagement — all in one clean workspace.
          </p>

          <div className="rk-fade-up rk-delay-3 flex flex-wrap items-center gap-4">
            <Link href="/signup">
              <button
                className="rk-btn-gold"
                style={{ width: "auto", padding: "0.75rem 2rem", fontSize: "0.95rem" }}
              >
                Start for free
              </button>
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: "var(--wm-text-muted)" }}
            >
              Already have an account
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Metrics bar ─────────────────────────────────────────────────── */}
      <div
        className="px-6 sm:px-12 lg:px-20 py-10"
        style={{ borderTop: "1px solid var(--wm-border)", borderBottom: "1px solid var(--wm-border)", background: "var(--wm-surface)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {METRICS.map((m) => (
            <div key={m.label}>
              <div
                className="text-2xl sm:text-3xl font-semibold mb-1"
                style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
              >
                {m.value}
              </div>
              <div className="text-sm font-medium mb-0.5" style={{ color: "var(--wm-text)" }}>{m.label}</div>
              <div className="text-xs" style={{ color: "var(--wm-text-sub)" }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14 max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8" style={{ background: "var(--wm-accent)" }} />
              <span className="text-xs uppercase tracking-[0.15em] font-medium" style={{ color: "var(--wm-accent)" }}>
                How it works
              </span>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)", lineHeight: 1.2 }}
            >
              Everything you need for
              <br />
              <span style={{ color: "var(--wm-text-muted)" }}>effective outreach at scale.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-6 sm:p-7"
                style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: "var(--wm-accent-dim)", color: "var(--wm-accent)" }}
                >
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--wm-text-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="px-6 sm:px-12 lg:px-20 pb-20">
        <div
          className="max-w-5xl mx-auto rounded-2xl relative overflow-hidden"
          style={{
            background: "var(--wm-surface)",
            border: "1px solid var(--wm-border)",
          }}
        >
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 px-8 sm:px-10 py-10">
            <div className="flex items-center gap-4">
              <TurbineIcon size={40} className="text-[var(--wm-accent)] opacity-30 hidden sm:block" />
              <div>
                <h2
                  className="text-xl sm:text-2xl font-semibold mb-1"
                  style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
                >
                  Ready to streamline your outreach?
                </h2>
                <p className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
                  Set up your first campaign in under 5 minutes.
                </p>
              </div>
            </div>
            <Link href="/signup" className="shrink-0">
              <button
                className="rk-btn-gold"
                style={{ width: "auto", padding: "0.75rem 2rem", fontSize: "0.9rem" }}
              >
                Get started free →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        className="px-6 sm:px-12 lg:px-20 pb-10 pt-8 flex flex-wrap items-center justify-between gap-6"
        style={{ borderTop: "1px solid var(--wm-border)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <TurbineIcon size={22} className="text-[var(--wm-accent)]" />
          <span className="font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}>
            Windmill
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-6">
          {[
            { label: "Pricing", href: "/pricing" },
            { label: "Blog",    href: "/blog"    },
            { label: "Sign in", href: "/login"   },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-xs" style={{ color: "var(--wm-text-sub)" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs" style={{ color: "var(--wm-text-sub)" }}>
          © 2026 Windmill
        </p>
      </footer>
    </div>
  );
}
