import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS } from "@/lib/blog/posts";

const CATEGORY_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  Deliverability:    { bg: "rgba(43,122,95,0.1)",  fg: "var(--wm-accent)", border: "rgba(43,122,95,0.25)" },
  "AI & Copywriting":{ bg: "rgba(139,92,246,0.1)",  fg: "#7c3aed", border: "rgba(139,92,246,0.25)" },
  Strategy:          { bg: "rgba(34,197,94,0.1)",   fg: "var(--wm-accent)", border: "rgba(34,197,94,0.25)"  },
  "List Building":   { bg: "rgba(56,189,248,0.1)",  fg: "#0284c7", border: "rgba(56,189,248,0.25)" },
  Analytics:         { bg: "rgba(251,146,60,0.1)",  fg: "#d97706", border: "rgba(251,146,60,0.25)" },
};

export async function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} — Windmill Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const cat = CATEGORY_COLORS[post.category] ?? { bg: "var(--wm-surface-2)", fg: "var(--wm-text-muted)", border: "var(--wm-border)" };
  const related = POSTS.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 2);
  const others = POSTS.filter((p) => p.slug !== post.slug && p.category !== post.category).slice(0, 2 - related.length);
  const suggestions = [...related, ...others].slice(0, 3);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--wm-bg)", color: "var(--wm-text)", fontFamily: "var(--font-body)" }}
    >
      {/* ── Nav ──────────────────────────────────────────────────── */}
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
          <Link href="/pricing" className="text-sm" style={{ color: "var(--wm-text-muted)" }}>Pricing</Link>
          <Link href="/blog" className="text-sm font-medium" style={{ color: "var(--wm-accent)" }}>Blog</Link>
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

      {/* ── Breadcrumb ───────────────────────────────────────────── */}
      <div
        className="px-6 sm:px-12 lg:px-20 py-4 flex items-center gap-2 text-xs"
        style={{ borderBottom: "1px solid var(--wm-border)", color: "var(--wm-text-sub)" }}
      >
        <Link href="/blog" className="hover:text-wm-accent transition-colors" style={{ color: "var(--wm-text-sub)" }}>
          Blog
        </Link>
        <span>/</span>
        <span style={{ color: "var(--wm-text-muted)" }}>{post.category}</span>
        <span>/</span>
        <span className="truncate max-w-[200px]" style={{ color: "var(--wm-text-muted)" }}>{post.title}</span>
      </div>

      {/* ── Article header ──────────────────────────────────────── */}
      <header className="relative overflow-hidden px-6 sm:px-12 lg:px-20 pt-14 pb-12">
        {/* ambient glow */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "-40px", right: "0",
            width: "500px", height: "300px",
            background: "radial-gradient(ellipse, rgba(43,122,95,0.07) 0%, transparent 65%)",
          }}
        />
        <div className="relative z-10 max-w-3xl">
          {/* Category badge */}
          <div className="rk-fade-up flex items-center gap-3 mb-6">
            <span
              className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
              style={{ background: cat.bg, color: cat.fg, border: `1px solid ${cat.border}` }}
            >
              {post.category}
            </span>
            <span className="text-xs" style={{ color: "var(--wm-text-sub)" }}>
              {post.readTime} read
            </span>
          </div>

          <h1
            className="rk-fade-up rk-delay-1 mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 600,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: "var(--wm-text)",
            }}
          >
            {post.title}
          </h1>

          <p
            className="rk-fade-up rk-delay-2 text-base leading-relaxed mb-8"
            style={{ color: "var(--wm-text-muted)", maxWidth: "560px" }}
          >
            {post.excerpt}
          </p>

          {/* Author row */}
          <div className="rk-fade-up rk-delay-3 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: "var(--wm-accent-dim)", color: "var(--wm-accent)" }}
            >
              {post.author.initials}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--wm-text)" }}>{post.author.name}</p>
              <p className="text-xs" style={{ color: "var(--wm-text-muted)" }}>
                {post.author.role} · {post.date}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div className="px-6 sm:px-12 lg:px-20">
        <div className="max-w-3xl h-px" style={{ background: "var(--wm-border)" }} />
      </div>

      {/* ── Article body ────────────────────────────────────────── */}
      <main className="px-6 sm:px-12 lg:px-20 py-12">
        <div className="max-w-3xl">
          <div
            className="rk-prose"
            dangerouslySetInnerHTML={{ __html: post.body }}
          />
        </div>
      </main>

      {/* ── Share + back row ────────────────────────────────────── */}
      <div
        className="px-6 sm:px-12 lg:px-20 py-8 flex flex-wrap items-center justify-between gap-4"
        style={{ borderTop: "1px solid var(--wm-border)" }}
      >
        <Link
          href="/blog"
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--wm-text-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to blog
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--wm-text-sub)" }}>Share:</span>
          {[
            {
              label: "Twitter/X",
              href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://windmill.email/blog/${post.slug}`)}`,
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              ),
            },
            {
              label: "LinkedIn",
              href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://windmill.email/blog/${post.slug}`)}`,
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              ),
            },
          ].map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share on ${s.label}`}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{
                background: "var(--wm-surface)",
                border: "1px solid var(--wm-border)",
                color: "var(--wm-text-muted)",
              }}
            >
              {s.icon}
            </a>
          ))}
        </div>
      </div>

      {/* ── Related posts ────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <section
          className="px-6 sm:px-12 lg:px-20 py-16"
          style={{ borderTop: "1px solid var(--wm-border)" }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-6" style={{ background: "var(--wm-accent)" }} />
              <span className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--wm-accent)" }}>
                More from the blog
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {suggestions.map((s) => {
                const sc = CATEGORY_COLORS[s.category] ?? { bg: "var(--wm-surface-2)", fg: "var(--wm-text-muted)", border: "var(--wm-border)" };
                return (
                  <Link key={s.slug} href={`/blog/${s.slug}`} className="group block">
                    <article
                      className="rk-blog-card h-full rounded-xl p-5 flex flex-col"
                    >
                      <span
                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3"
                        style={{ background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}` }}
                      >
                        {s.category}
                      </span>
                      <h3
                        className="font-semibold text-sm leading-snug flex-1 mb-3"
                        style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
                      >
                        {s.title}
                      </h3>
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--wm-border)" }}>
                        <span className="text-xs" style={{ color: "var(--wm-text-sub)" }}>
                          {s.date} · {s.readTime}
                        </span>
                        <svg
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="var(--wm-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section
        className="px-6 sm:px-12 lg:px-20 pb-20 pt-8"
        style={{ borderTop: suggestions.length > 0 ? "none" : "1px solid var(--wm-border)" }}
      >
        <div
          className="max-w-5xl mx-auto rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f2318 0%, #122b22 60%, #0a1915 100%)",
            border: "1px solid var(--wm-border)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 15% 50%, rgba(43,122,95,0.1) 0%, transparent 55%), radial-gradient(ellipse at 85% 50%, rgba(43,122,95,0.06) 0%, transparent 55%)",
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-8 px-10 py-10">
            <div>
              <h2
                className="text-xl sm:text-2xl font-semibold mb-1.5"
                style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
              >
                Put these ideas into practice.
              </h2>
              <p className="text-sm" style={{ color: "var(--wm-text-sub)" }}>
                Windmill is free to start — no credit card required.
              </p>
            </div>
            <Link href="/signup" className="shrink-0">
              <button
                className="rk-btn-gold"
                style={{ width: "auto", padding: "0.85rem 2.2rem", fontSize: "0.9rem" }}
              >
                Try Windmill free →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer
        className="px-6 sm:px-12 lg:px-20 pb-10 pt-8 flex flex-wrap items-center justify-between gap-6"
        style={{ borderTop: "1px solid var(--wm-border)" }}
      >
        <Link href="/">
          <span className="font-bold cursor-pointer" style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}>
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
