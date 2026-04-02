import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    tagline: "Learn the ropes.",
    price: { monthly: 0, annual: 0 },
    highlight: false,
    badge: null,
    cta: "Get started free",
    ctaHref: "/signup",
    features: [
      { text: "500 emails / month", included: true },
      { text: "1 active campaign", included: true },
      { text: "Up to 250 contacts", included: true },
      { text: "AI email drafting (5/mo)", included: true },
      { text: "Open & click tracking", included: true },
      { text: "Basic analytics", included: true },
      { text: "Email templates (3)", included: true },
      { text: "Custom sending domain", included: false },
      { text: "AI personalization at scale", included: false },
      { text: "Smart follow-up sequences", included: false },
      { text: "Priority support", included: false },
      { text: "Team seats", included: false },
    ],
  },
  {
    name: "Growth",
    tagline: "Built for serious outreach.",
    price: { monthly: 49, annual: 39 },
    highlight: true,
    badge: "Most popular",
    cta: "Start 14-day trial",
    ctaHref: "/signup?plan=growth",
    features: [
      { text: "10,000 emails / month", included: true },
      { text: "Unlimited campaigns", included: true },
      { text: "Up to 5,000 contacts", included: true },
      { text: "Unlimited AI drafting", included: true },
      { text: "Open & click tracking", included: true },
      { text: "Advanced analytics & reports", included: true },
      { text: "Unlimited email templates", included: true },
      { text: "Custom sending domain", included: true },
      { text: "AI personalization at scale", included: true },
      { text: "Smart follow-up sequences", included: true },
      { text: "Priority support", included: false },
      { text: "Team seats", included: false },
    ],
  },
  {
    name: "Scale",
    tagline: "For teams that move fast.",
    price: { monthly: 129, annual: 99 },
    highlight: false,
    badge: null,
    cta: "Talk to us",
    ctaHref: "/signup?plan=scale",
    features: [
      { text: "Unlimited emails", included: true },
      { text: "Unlimited campaigns", included: true },
      { text: "Unlimited contacts", included: true },
      { text: "Unlimited AI drafting", included: true },
      { text: "Open & click tracking", included: true },
      { text: "Advanced analytics & reports", included: true },
      { text: "Unlimited email templates", included: true },
      { text: "Custom sending domain", included: true },
      { text: "AI personalization at scale", included: true },
      { text: "Smart follow-up sequences", included: true },
      { text: "Priority support", included: true },
      { text: "Up to 5 team seats", included: true },
    ],
  },
];

const FAQ = [
  {
    q: "Is the free plan really free forever?",
    a: "Yes — the Starter plan has no time limit. You can send up to 500 emails a month, run one campaign, and use AI drafting 5 times per month at no cost.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Absolutely. No lock-ins, no cancellation fees. Cancel from your account settings and you retain access until the end of your billing period.",
  },
  {
    q: "What happens when I hit my email limit?",
    a: "We'll notify you when you're approaching your limit. Emails over the cap are queued until the next billing cycle, or you can upgrade instantly to avoid disruptions.",
  },
  {
    q: "Do you offer annual billing discounts?",
    a: "Yes — paying annually saves you roughly 20% compared to monthly. The annual price is displayed when you toggle the billing period above.",
  },
  {
    q: "What is a 'custom sending domain'?",
    a: "Instead of sending from a ReachKit subdomain, you authenticate your own domain (e.g., outreach@yourcompany.com). This significantly improves deliverability and brand trust.",
  },
  {
    q: "Do you offer a startup or non-profit discount?",
    a: "We do. Email us at hello@reachkit.ai with a brief description of your org and we'll work something out.",
  },
];

const LOGOS = [
  "Vercel", "Stripe", "Linear", "Notion", "Figma", "Loom",
];

export default function PricingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--rk-bg)", color: "var(--rk-text)", fontFamily: "var(--font-body)" }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────── */}
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
        <div className="hidden sm:flex items-center gap-6">
          <Link href="/pricing" className="text-sm font-medium" style={{ color: "var(--rk-gold)" }}>
            Pricing
          </Link>
          <Link href="/blog" className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
            Blog
          </Link>
        </div>
        <div className="flex items-center gap-3">
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

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 sm:px-12 lg:px-20 pt-20 pb-16 text-center">
        {/* ambient glow */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "-60px", left: "50%", transform: "translateX(-50%)",
            width: "800px", height: "400px",
            background: "radial-gradient(ellipse, rgba(184,135,58,0.09) 0%, transparent 65%)",
          }}
        />
        {/* ghost letter */}
        <span
          aria-hidden
          className="absolute select-none pointer-events-none"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(200px, 30vw, 420px)",
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--rk-gold)",
            opacity: 0.025,
            top: "-20px",
            left: "50%",
            transform: "translateX(-50%)",
            letterSpacing: "-0.06em",
            whiteSpace: "nowrap",
          }}
        >
          $
        </span>

        <div className="relative z-10 max-w-2xl mx-auto">
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
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--rk-gold)" }} />
              SIMPLE, HONEST PRICING
            </span>
          </div>

          <h1
            className="rk-fade-up rk-delay-1 mb-5"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
            }}
          >
            Pay for what you send.
            <br />
            <em style={{ color: "var(--rk-gold)", fontStyle: "italic" }}>Not what you don&apos;t.</em>
          </h1>

          <p
            className="rk-fade-up rk-delay-2 text-lg leading-relaxed"
            style={{ color: "var(--rk-text-muted)", maxWidth: "460px", margin: "0 auto" }}
          >
            Three tiers — from free to unlimited. No feature gating on the things that matter.
            Upgrade only when your volume demands it.
          </p>
        </div>
      </section>

      {/* ── Pricing Cards ─────────────────────────────────────────── */}
      <section className="px-6 sm:px-12 lg:px-20 pb-24">
        <div className="max-w-6xl mx-auto">
          {/* Billing toggle label */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className="text-sm" style={{ color: "var(--rk-text-muted)" }}>Monthly</span>
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: "var(--rk-gold-dim)",
                border: "1px solid rgba(184,135,58,0.25)",
                color: "var(--rk-gold)",
              }}
            >
              Save 20% annually
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-0 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--rk-border)" }}>
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                className="relative flex flex-col"
                style={{
                  background: plan.highlight
                    ? "linear-gradient(160deg, #1a1610 0%, #141210 100%)"
                    : "var(--rk-surface)",
                  borderLeft: plan.highlight ? "1px solid rgba(184,135,58,0.25)" : undefined,
                  borderRight: plan.highlight
                    ? "1px solid rgba(184,135,58,0.25)"
                    : i < PLANS.length - 1
                    ? "1px solid var(--rk-border)"
                    : "none",
                }}
              >
                {/* Popular badge */}
                {plan.badge && (
                  <div
                    className="absolute -top-px left-0 right-0 flex justify-center"
                  >
                    <span
                      className="text-xs font-semibold px-4 py-1 rounded-b-lg"
                      style={{
                        background: "var(--rk-gold)",
                        color: "#0d0d0f",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Ambient glow for highlight card */}
                {plan.highlight && (
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none rounded-2xl"
                    style={{
                      background: "radial-gradient(ellipse at 50% 0%, rgba(184,135,58,0.12) 0%, transparent 60%)",
                    }}
                  />
                )}

                <div className="relative p-8 flex flex-col flex-1">
                  {/* Plan name */}
                  <div className="mb-6">
                    <p
                      className="text-xs uppercase tracking-[0.16em] mb-1.5"
                      style={{ color: plan.highlight ? "var(--rk-gold)" : "var(--rk-text-muted)" }}
                    >
                      {plan.name}
                    </p>
                    <p className="text-sm" style={{ color: plan.highlight ? "rgba(255,255,255,0.45)" : "var(--rk-text-muted)" }}>{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-8 flex items-end gap-1.5">
                    {plan.price.monthly === 0 ? (
                      <span
                        className="text-5xl font-bold"
                        style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)", lineHeight: 1 }}
                      >
                        Free
                      </span>
                    ) : (
                      <>
                        <span
                          className="text-5xl font-bold leading-none"
                          style={{ fontFamily: "var(--font-display)", color: plan.highlight ? "#f5f0e6" : "var(--rk-text)" }}
                        >
                          ${plan.price.monthly}
                        </span>
                        <span className="text-sm mb-1.5" style={{ color: plan.highlight ? "rgba(255,255,255,0.4)" : "var(--rk-text-muted)" }}>/mo</span>
                      </>
                    )}
                  </div>

                  {/* CTA */}
                  <Link href={plan.ctaHref} className="block mb-8">
                    {plan.highlight ? (
                      <button
                        className="rk-btn-gold"
                        style={{ fontSize: "0.9rem" }}
                      >
                        {plan.cta}
                      </button>
                    ) : (
                      <button
                        className="w-full text-sm font-medium py-2.5 px-4 rounded-lg transition-all"
                        style={{
                          background: "var(--rk-surface-2)",
                          border: "1px solid var(--rk-border-md)",
                          color: "var(--rk-text)",
                          cursor: "pointer",
                        }}
                      >
                        {plan.cta}
                      </button>
                    )}
                  </Link>

                  {/* Divider */}
                  <div className="mb-6 h-px" style={{ background: plan.highlight ? "rgba(255,255,255,0.1)" : "var(--rk-border)" }} />

                  {/* Features */}
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-start gap-2.5">
                        {f.included ? (
                          <svg
                            className="shrink-0 mt-0.5"
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke={plan.highlight ? "var(--rk-gold)" : "var(--rk-text-muted)"}
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg
                            className="shrink-0 mt-0.5"
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke={plan.highlight ? "rgba(255,255,255,0.2)" : "var(--rk-text-sub)"}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                        <span
                          className="text-sm leading-snug"
                          style={{
                            color: f.included
                              ? plan.highlight ? "#f0ede8" : "var(--rk-text)"
                              : plan.highlight ? "rgba(255,255,255,0.25)" : "var(--rk-text-sub)",
                          }}
                        >
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Enterprise row */}
          <div
            className="mt-4 rounded-xl px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{
              background: "var(--rk-surface)",
              border: "1px solid var(--rk-border)",
            }}
          >
            <div>
              <p className="font-semibold mb-0.5" style={{ color: "var(--rk-text)" }}>Enterprise</p>
              <p className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
                Custom volume, SSO, dedicated IP, SLA, and white-glove onboarding.
              </p>
            </div>
            <a
              href="mailto:hello@reachkit.ai"
              className="shrink-0 text-sm font-medium px-6 py-2.5 rounded-lg"
              style={{
                background: "var(--rk-surface-2)",
                border: "1px solid var(--rk-border-md)",
                color: "var(--rk-text)",
                textDecoration: "none",
              }}
            >
              Contact sales →
            </a>
          </div>
        </div>
      </section>

      {/* ── Social proof logos ─────────────────────────────────────── */}
      <section
        className="px-6 sm:px-12 lg:px-20 py-14"
        style={{ borderTop: "1px solid var(--rk-border)", borderBottom: "1px solid var(--rk-border)" }}
      >
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs uppercase tracking-[0.18em] mb-8" style={{ color: "var(--rk-text-sub)" }}>
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {LOGOS.map((name) => (
              <span
                key={name}
                className="text-sm font-semibold"
                style={{ color: "var(--rk-text-sub)", letterSpacing: "-0.01em" }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison callout ─────────────────────────────────────── */}
      <section className="px-6 sm:px-12 lg:px-20 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: "var(--rk-gold)" }} />
            <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--rk-gold)" }}>
              Why ReachKit
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl font-semibold mb-14"
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.15 }}
          >
            Half the price of the incumbents.
            <br />
            <span style={{ color: "var(--rk-text-muted)", fontWeight: 400 }}>Twice the AI.</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--rk-border)" }}>
                  {["Feature", "ReachKit Growth", "Competitor A", "Competitor B"].map((h, i) => (
                    <th
                      key={h}
                      className="text-left py-3 pr-8"
                      style={{
                        color: i === 1 ? "var(--rk-gold)" : "var(--rk-text-muted)",
                        fontWeight: i === 1 ? 600 : 400,
                        fontSize: "0.8rem",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Monthly price",          "$49",         "$99",         "$89"],
                  ["Emails / month",          "10,000",      "5,000",       "7,500"],
                  ["AI drafting",             "Unlimited",   "50 / month",  "Add-on"],
                  ["AI personalization",      "✓",           "—",           "—"],
                  ["Smart follow-ups",        "✓",           "✓",           "—"],
                  ["Custom sending domain",   "✓",           "✓",           "✓"],
                  ["Open & click tracking",   "✓",           "✓",           "✓"],
                ].map(([feat, ...vals]) => (
                  <tr key={feat} style={{ borderBottom: "1px solid var(--rk-border)" }}>
                    <td className="py-3.5 pr-8" style={{ color: "var(--rk-text-muted)" }}>{feat}</td>
                    {vals.map((v, i) => (
                      <td
                        key={i}
                        className="py-3.5 pr-8 font-medium"
                        style={{ color: i === 0 ? "var(--rk-text)" : "var(--rk-text-sub)" }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section
        className="px-6 sm:px-12 lg:px-20 py-24"
        style={{ borderTop: "1px solid var(--rk-border)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: "var(--rk-gold)" }} />
            <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--rk-gold)" }}>
              FAQ
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl font-semibold mb-14"
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.15 }}
          >
            Questions we get asked.
          </h2>

          <div className="space-y-0">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="py-6"
                style={{ borderBottom: "1px solid var(--rk-border)" }}
              >
                <p
                  className="font-semibold mb-2.5"
                  style={{ color: "var(--rk-text)", fontSize: "0.95rem" }}
                >
                  {item.q}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--rk-text-muted)" }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
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
                Start for free. Grow when ready.
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
                No credit card required for the Starter plan.
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

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer
        className="px-6 sm:px-12 lg:px-20 pb-10 pt-8 flex flex-wrap items-center justify-between gap-6"
        style={{ borderTop: "1px solid var(--rk-border)" }}
      >
        <Link href="/">
          <span
            className="font-bold cursor-pointer"
            style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
          >
            ReachKit<span style={{ color: "var(--rk-gold)" }}>.ai</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-6">
          {[
            { label: "Home", href: "/" },
            { label: "Pricing", href: "/pricing" },
            { label: "Blog", href: "/blog" },
            { label: "Sign in", href: "/login" },
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
