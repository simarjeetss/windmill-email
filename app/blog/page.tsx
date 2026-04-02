import Link from "next/link";
import { POSTS } from "@/lib/blog/posts";

const CATEGORIES = ["All", ...Array.from(new Set(POSTS.map((p) => p.category)))];

const CATEGORY_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  Deliverability:    { bg: "rgba(43,122,95,0.1)",  fg: "var(--wm-accent)", border: "rgba(43,122,95,0.25)" },
  "AI & Copywriting":{ bg: "rgba(139,92,246,0.1)",  fg: "#7c3aed", border: "rgba(139,92,246,0.25)" },
  Strategy:          { bg: "rgba(34,197,94,0.1)",   fg: "var(--wm-accent)", border: "rgba(34,197,94,0.25)"  },
  "List Building":   { bg: "rgba(56,189,248,0.1)",  fg: "#0284c7", border: "rgba(56,189,248,0.25)" },
  Analytics:         { bg: "rgba(251,146,60,0.1)",  fg: "#d97706", border: "rgba(251,146,60,0.25)" },
};

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] ?? { bg: "var(--wm-surface-2)", fg: "var(--wm-text-muted)", border: "var(--wm-border)" };
  return (
    <span
      className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
    >
      {category}
    </span>
  );
}

export default function BlogPage() {
  const featured = POSTS.find((p) => p.featured)!;
  const rest = POSTS.filter((p) => !p.featured);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--wm-bg)", color: "var(--wm-text)", fontFamily: "var(--font-body)" }}
    >
      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav
        className="flex items-center justify-between px-6 sm:px-12 lg:px-20 h-16"
        style={{ borderBottom: "1px solid var(--wm-border)" }}
      >
        <Link href="/">
          <span
            className="text-xl font-bold tracking-tight cursor-pointer"
            style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
          >
            Windmill
          </span>
        </Link>
        <div className="hidden sm:flex items-center gap-6">
          <Link href="/pricing" className="text-sm" style={{ color: "var(--wm-text-muted)" }}>
            Pricing
          </Link>
          <Link href="/blog" className="text-sm font-medium" style={{ color: "var(--wm-accent)" }}>
            Blog
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm px-4 py-2 rounded-lg" style={{ color: "var(--wm-text-muted)" }}>
            Sign in
          </Link>
          <Link href="/signup">
            <button
              className="text-sm font-semibold px-5 py-2 rounded-lg"
              style={{ background: "var(--wm-text)", color: "var(--wm-bg)", border: "none", cursor: "pointer" }}
            >
              Get started
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero header ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 sm:px-12 lg:px-20 pt-20 pb-16">
        {/* ambient glow */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "-40px", left: "0",
            width: "500px", height: "300px",
            background: "radial-gradient(ellipse, rgba(43,122,95,0.07) 0%, transparent 65%)",
          }}
        />
        <div className="relative z-10 max-w-2xl">
          <div className="rk-fade-up inline-flex items-center gap-2 mb-6">
            <span
              className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full"
              style={{
                background: "var(--wm-accent-dim)",
                border: "1px solid rgba(43,122,95,0.3)",
                color: "var(--wm-accent)",
                letterSpacing: "0.05em",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--wm-accent)" }} />
              THE WINDMILL BLOG
            </span>
          </div>
          <h1
            className="rk-fade-up rk-delay-1 mb-4"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Cold outreach,<br />
            <em style={{ color: "var(--wm-accent)" }}>made legible.</em>
          </h1>
          <p className="rk-fade-up rk-delay-2 text-base leading-relaxed" style={{ color: "var(--wm-text-muted)" }}>
            Tactics, research, and frameworks for founders and growth teams sending outbound.
          </p>
        </div>
      </section>

      {/* ── Featured post ─────────────────────────────────────────── */}
      <section
        className="px-6 sm:px-12 lg:px-20 pb-16"
        style={{ borderBottom: "1px solid var(--wm-border)" }}
      >
        <div className="max-w-6xl mx-auto">
          <Link href={`/blog/${featured.slug}`} className="group block">
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                background: "linear-gradient(145deg, #1a1610 0%, #0e0d0b 100%)",
                border: "1px solid rgba(43,122,95,0.15)",
              }}
            >
              {/* glow overlay */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 70% 50%, rgba(43,122,95,0.1) 0%, transparent 60%)",
                }}
              />

              <div className="relative p-8 sm:p-12 grid sm:grid-cols-[1fr_auto] gap-8 items-end">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <CategoryBadge category={featured.category} />
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--wm-accent-dim)", color: "var(--wm-accent)", border: "1px solid rgba(43,122,95,0.25)" }}
                    >
                      Featured
                    </span>
                  </div>
                  <h2
                    className="mb-4 group-hover:opacity-80 transition-opacity"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                      fontWeight: 600,
                      lineHeight: 1.2,
                      color: "var(--wm-text)",
                    }}
                  >
                    {featured.title}
                  </h2>
                  <p
                    className="text-sm leading-relaxed mb-6 max-w-xl"
                    style={{ color: "var(--wm-text-sub)" }}
                  >
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "rgba(43,122,95,0.2)", color: "var(--wm-accent)" }}
                    >
                      {featured.author.initials}
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--wm-text)" }}>
                        {featured.author.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--wm-text-sub)" }}>
                        {featured.date} · {featured.readTime} read
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-2 text-right">
                  <span
                    className="text-xs font-medium flex items-center gap-1.5 group-hover:gap-3 transition-all"
                    style={{ color: "var(--wm-accent)" }}
                  >
                    Read article
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── All posts grid ───────────────────────────────────────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Category filters label */}
          <div className="flex flex-wrap items-center gap-2 mb-10">
            <span className="text-xs uppercase tracking-[0.14em] mr-3" style={{ color: "var(--wm-text-sub)" }}>
              Browse:
            </span>
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="text-xs px-3 py-1 rounded-full cursor-default"
                style={{
                  background: cat === "All" ? "var(--wm-accent-dim)" : "var(--wm-surface)",
                  border: `1px solid ${cat === "All" ? "rgba(43,122,95,0.3)" : "var(--wm-border)"}`,
                  color: cat === "All" ? "var(--wm-accent)" : "var(--wm-text-muted)",
                }}
              >
                {cat}
              </span>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post, i) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                <article
                  className="rk-blog-card h-full flex flex-col rounded-xl p-6"
                >
                  {/* Category + read time */}
                  <div className="flex items-center justify-between mb-4">
                    <CategoryBadge category={post.category} />
                    <span className="text-xs" style={{ color: "var(--wm-text-sub)" }}>
                      {post.readTime}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="font-semibold mb-3 leading-snug flex-1"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.05rem",
                      color: "var(--wm-text)",
                      lineHeight: 1.35,
                    }}
                  >
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p
                    className="text-sm leading-relaxed mb-5"
                    style={{ color: "var(--wm-text-muted)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  >
                    {post.excerpt}
                  </p>

                  {/* Author + date */}
                  <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid var(--wm-border)" }}>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "var(--wm-accent-dim)", color: "var(--wm-accent)" }}
                    >
                      {post.author.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate" style={{ color: "var(--wm-text)" }}>
                        {post.author.name}
                      </p>
                      <p className="text-xs leading-tight" style={{ color: "var(--wm-text-sub)" }}>
                        {post.date}
                      </p>
                    </div>
                    <svg
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="var(--wm-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter CTA ──────────────────────────────────────── */}
      <section
        className="px-6 sm:px-12 lg:px-20 py-16"
        style={{ borderTop: "1px solid var(--wm-border)" }}
      >
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="text-2xl font-semibold mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
          >
            Get new posts in your inbox
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--wm-text-muted)" }}>
            One email when something worth reading is published. No filler.
          </p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="you@company.com"
              className="rk-auth-input"
              style={{ flex: 1 }}
            />
            <button
              className="rk-btn-gold shrink-0"
              style={{ width: "auto", padding: "0.7rem 1.5rem", animation: "none" }}
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer
        className="px-6 sm:px-12 lg:px-20 pb-10 pt-8 flex flex-wrap items-center justify-between gap-6"
        style={{ borderTop: "1px solid var(--wm-border)" }}
      >
        <Link href="/">
          <span
            className="font-bold cursor-pointer"
            style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
          >
            Windmill
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-6">
          {[
            { label: "Home", href: "/" },
            { label: "Pricing", href: "/pricing" },
            { label: "Blog", href: "/blog" },
            { label: "Sign in", href: "/login" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-xs" style={{ color: "var(--wm-text-sub)" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs" style={{ color: "var(--wm-text-sub)" }}>© 2026 Windmill</p>
      </footer>
    </div>
  );
}
