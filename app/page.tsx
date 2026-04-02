import Link from "next/link";

const METRICS = [
  { label: "Sent",    value: "2,841", pct: 72,  delta: "+12% this week" },
  { label: "Opens",   value: "68.4%", pct: 68,  delta: "+3.1 pts" },
  { label: "Replies", value: "9.2%",  pct: 9,   delta: "+1.8 pts" },
];

const CONTACTS = [
  { name: "Sarah Chen",  co: "Vercel",  status: "opened"  },
  { name: "Marcus Hill", co: "Stripe",  status: "sent"    },
  { name: "Priya Nair",  co: "Linear",  status: "clicked" },
];

const FEATURES = [
  { num: "01", title: "AI Drafting",           desc: "The model mirrors your voice — learns from every edit you make." },
  { num: "02", title: "Deep Personalization",  desc: "First name, company, role — injected at send time, per contact." },
  { num: "03", title: "Open & Click Tracking", desc: "Pixel-accurate opens and redirect-based click tracking, live." },
  { num: "04", title: "Smart Follow-ups",      desc: "Sequences that pause the moment a reply lands in your inbox." },
];

const STATUS_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  opened:  { bg: "rgba(34,197,94,0.12)",  fg: "#4ade80",  border: "rgba(34,197,94,0.25)"  },
  clicked: { bg: "rgba(139,92,246,0.12)", fg: "#a78bfa",  border: "rgba(139,92,246,0.25)" },
  sent:    { bg: "rgba(255,255,255,0.06)", fg: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" },
};

export default function Home() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--rk-bg)", color: "var(--rk-text)", fontFamily: "var(--font-body)" }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="flex items-center justify-between px-6 sm:px-12 lg:px-20 h-16"
        style={{ borderBottom: "1px solid var(--rk-border)" }}
      >
        <Link href="/">
          <span
            className="text-xl font-bold tracking-tight cursor-pointer"
            style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
          >
            ReachKit<span style={{ color: "var(--rk-gold)" }}>.ai</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-5 mr-3">
            <Link
              href="/pricing"
              className="text-sm"
              style={{ color: "var(--rk-text-muted)" }}
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="text-sm"
              style={{ color: "var(--rk-text-muted)" }}
            >
              Blog
            </Link>
          </div>
          <Link
            href="/login"
            className="text-sm px-4 py-2 rounded-lg"
            style={{ color: "var(--rk-text-muted)" }}
          >
            Sign in
          </Link>
          <Link href="/signup">
            <button
              className="text-sm font-semibold px-5 py-2 rounded-lg"
              style={{ background: "var(--rk-text)", color: "var(--rk-bg)", border: "none", cursor: "pointer" }}
            >
              Get started
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 sm:px-12 lg:px-20 pt-20 pb-0"
      >
        {/* Subtle warm radial behind the headline */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "-80px", left: "30%",
            width: "700px", height: "500px",
            background: "radial-gradient(ellipse, rgba(184,135,58,0.07) 0%, transparent 65%)",
          }}
        />

        {/* Ghost lettermark */}
        <span
          aria-hidden
          className="absolute select-none pointer-events-none"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(260px, 38vw, 540px)",
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--rk-gold)",
            opacity: 0.028,
            top: "0px",
            right: "-3%",
            letterSpacing: "-0.06em",
          }}
        >
          R
        </span>

        {/* ── Headline block ── */}
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Eyebrow pill */}
          <div className="rk-fade-up inline-flex items-center gap-2 mb-8">
            <span
              className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full"
              style={{
                background: "var(--rk-gold-dim)",
                border: "1px solid rgba(184,135,58,0.3)",
                color: "var(--rk-gold)",
                letterSpacing: "0.05em",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--rk-gold)" }}
              />
              AI-POWERED COLD OUTREACH
            </span>
          </div>

          <h1
            className="rk-fade-up rk-delay-1 mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.8rem, 6vw, 5rem)",
              fontWeight: 600,
              lineHeight: 1.06,
              letterSpacing: "-0.025em",
              color: "var(--rk-text)",
            }}
          >
            Cold email that sounds like{" "}
            <br className="hidden sm:block" />
            <em style={{ color: "var(--rk-gold)" }}>you wrote every word.</em>
          </h1>

          <p
            className="rk-fade-up rk-delay-2 mb-10 text-lg leading-relaxed mx-auto"
            style={{ color: "var(--rk-text-muted)", maxWidth: "520px" }}
          >
            ReachKit handles AI drafting, per-contact personalization, and engagement
            tracking — in one focused tool.
          </p>

          <div className="rk-fade-up rk-delay-3 flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link href="/signup">
              <button
                className="rk-btn-gold"
                style={{ width: "auto", padding: "0.9rem 2.6rem", fontSize: "1rem" }}
              >
                Start for free
              </button>
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: "var(--rk-text-muted)" }}
            >
              Already have an account
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Floating dashboard card ── */}
        <div className="rk-fade-up rk-delay-4 relative z-10 max-w-4xl mx-auto">
          {/* Halo glow underneath the card */}
          <div
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              inset: "20px -20px -40px",
              background: "radial-gradient(ellipse at 50% 100%, rgba(184,135,58,0.18) 0%, transparent 65%)",
              filter: "blur(24px)",
            }}
          />

          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #1a1610 0%, #0d0d0f 55%, #111014 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset",
            }}
          >
            {/* Window chrome bar */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
              <span
                className="ml-4 text-xs"
                style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)" }}
              >
                reachkit.ai / campaigns / Q1 Outreach
              </span>
              <div className="flex-1" />
              <span
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.22)",
                  color: "#4ade80",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
                Live
              </span>
            </div>

            {/* Dashboard content */}
            <div className="grid sm:grid-cols-[1fr_1px_1fr] gap-0">

              {/* Left — metrics */}
              <div className="p-6 space-y-3">
                <p
                  className="text-xs uppercase tracking-widest mb-4"
                  style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.14em" }}
                >
                  Campaign metrics
                </p>
                {METRICS.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl px-4 py-3.5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>{m.label}</span>
                      <span className="text-xs font-medium" style={{ color: "#86efac" }}>{m.delta}</span>
                    </div>
                    <div
                      className="text-2xl font-semibold"
                      style={{ fontFamily: "var(--font-display)", color: "#f5f0e6", lineHeight: 1 }}
                    >
                      {m.value}
                    </div>
                    <div
                      className="mt-3 h-1 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${m.pct}%`,
                          background: "linear-gradient(90deg, #b8873a, #e8c47a)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ background: "rgba(255,255,255,0.05)" }} />

              {/* Right — contacts */}
              <div className="p-6">
                <p
                  className="text-xs uppercase tracking-widest mb-4"
                  style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.14em" }}
                >
                  Recent contacts
                </p>
                <div className="space-y-2 mb-6">
                  {CONTACTS.map((c) => {
                    const s = STATUS_COLOR[c.status];
                    return (
                      <div
                        key={c.name}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: "rgba(184,135,58,0.14)", color: "#d4a853" }}
                          >
                            {c.name[0]}
                          </div>
                          <div>
                            <div className="text-xs font-medium leading-tight" style={{ color: "#f0ede8" }}>{c.name}</div>
                            <div className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.28)" }}>{c.co}</div>
                          </div>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}` }}
                        >
                          {c.status}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Quote */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(184,135,58,0.07)", border: "1px solid rgba(184,135,58,0.15)" }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>
                    &ldquo;Replies went up 3&times; the first week. The AI actually sounds like me.&rdquo;
                  </p>
                  <p className="text-xs mt-2 font-medium" style={{ color: "#d4a853" }}>— Early beta user</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div
        className="px-6 sm:px-12 lg:px-20 py-10 mt-16 flex flex-wrap items-center justify-center gap-12"
        style={{ borderTop: "1px solid var(--rk-border)", borderBottom: "1px solid var(--rk-border)" }}
      >
        {[
          { n: "10k+", label: "Emails sent" },
          { n: "68%",  label: "Avg open rate" },
          { n: "9%",   label: "Avg reply rate" },
          { n: "< 5m", label: "Setup time" },
        ].map((s, i, arr) => (
          <div key={s.label} className="flex items-center gap-10">
            <div className="text-center">
              <div
                className="text-3xl font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
              >
                {s.n}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--rk-text-muted)" }}>{s.label}</div>
            </div>
            {i < arr.length - 1 && (
              <div className="w-px h-8" style={{ background: "var(--rk-border)" }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16 max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8" style={{ background: "var(--rk-gold)" }} />
              <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--rk-gold)" }}>
                How it works
              </span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)", lineHeight: 1.15 }}
            >
              Everything you need.<br />
              <span style={{ color: "var(--rk-text-muted)", fontWeight: 400 }}>Nothing you don&apos;t.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "var(--rk-border)" }}>
            {FEATURES.map((f) => (
              <div
                key={f.num}
                className="p-8"
                style={{ background: "var(--rk-bg)" }}
              >
                <div
                  className="text-4xl font-bold mb-5 leading-none"
                  style={{ fontFamily: "var(--font-display)", color: "var(--rk-gold)", opacity: 0.3 }}
                >
                  {f.num}
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--rk-text)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--rk-text-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="px-6 sm:px-12 lg:px-20 pb-24">
        <div
          className="max-w-5xl mx-auto rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #16130c 0%, #0d0d0f 60%, #13100d 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 15% 50%, rgba(184,135,58,0.1) 0%, transparent 55%), radial-gradient(ellipse at 85% 50%, rgba(184,135,58,0.06) 0%, transparent 55%)",
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-8 px-10 py-12">
            <div>
              <h2
                className="text-2xl sm:text-3xl font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "#f5f0e6" }}
              >
                Ready to fill your pipeline?
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
                Set up your first campaign in under 5 minutes.
              </p>
            </div>
            <Link href="/signup" className="shrink-0">
              <button
                className="rk-btn-gold"
                style={{ width: "auto", padding: "0.9rem 2.4rem", fontSize: "0.95rem" }}
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
        style={{ borderTop: "1px solid var(--rk-border)" }}
      >
        <span
          className="font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
        >
          ReachKit<span style={{ color: "var(--rk-gold)" }}>.ai</span>
        </span>
        <nav className="flex flex-wrap items-center gap-6">
          {[
            { label: "Pricing", href: "/pricing" },
            { label: "Blog",    href: "/blog"    },
            { label: "Sign in", href: "/login"   },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-xs" style={{ color: "var(--rk-text-sub)" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs" style={{ color: "var(--rk-text-sub)" }}>
          © 2026 ReachKit.ai
        </p>
      </footer>
    </div>
  );
}
