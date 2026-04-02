import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--wm-bg)" }}
    >
      {/* ── Left panel — green-tinted decorative panel ──────────────── */}
      <div
        className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between p-14"
        style={{
          background: "linear-gradient(145deg, #122b22 0%, #0f1f1a 50%, #0a1915 100%)",
          borderRight: "1px solid rgba(43,122,95,0.15)",
        }}
      >
        {/* Ambient accent glow — top left */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "-60px", left: "-60px",
            width: "500px", height: "500px",
            background: "radial-gradient(circle, rgba(43,122,95,0.12) 0%, transparent 65%)",
          }}
        />
        {/* Ambient accent glow — bottom right */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            bottom: "-40px", right: "-40px",
            width: "380px", height: "380px",
            background: "radial-gradient(circle, rgba(43,122,95,0.08) 0%, transparent 65%)",
          }}
        />

        {/* Subtle dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(232,237,233,0.06) 0.8px, transparent 0.8px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Logo */}
        <div className="rk-fade-up relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none" style={{ color: "#4ade80" }}>
              <line x1="24" y1="24" x2="24" y2="46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="24" r="3" fill="currentColor" />
              <g style={{ transformOrigin: "24px 24px" }}>
                <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" />
                <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(120 24 24)" />
                <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(240 24 24)" />
              </g>
            </svg>
            <span
              className="text-2xl font-semibold tracking-tight cursor-pointer"
              style={{ fontFamily: "var(--font-display)", color: "#e8ede9" }}
            >
              Windmill
            </span>
          </Link>
        </div>

        {/* Central quote */}
        <div className="relative z-10 max-w-md">
          <div
            className="rk-fade-up rk-delay-1 mb-8 w-10 h-[2px]"
            style={{ background: "#4ade80" }}
          />
          <blockquote
            className="rk-fade-up rk-delay-2 mb-5 text-[2.1rem] font-medium leading-[1.18]"
            style={{
              fontFamily: "var(--font-display)",
              color: "#e8ede9",
              fontStyle: "italic",
              letterSpacing: "-0.01em",
            }}
          >
            &ldquo;Streamlined outreach for the companies powering a cleaner future.&rdquo;
          </blockquote>
          <p
            className="rk-fade-up rk-delay-3 text-sm"
            style={{ color: "rgba(232,237,233,0.4)", fontFamily: "var(--font-body)" }}
          >
            Email campaigns built for wind energy professionals
          </p>
        </div>

        {/* Bottom stats row */}
        <div className="rk-fade-up rk-delay-4 relative z-10 grid grid-cols-3 gap-6">
          {[
            { value: "2,100+", label: "Companies" },
            { value: "48K+",   label: "Emails sent" },
            { value: "67%",    label: "Open rate" },
          ].map((stat) => (
            <div key={stat.label}>
              <div
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "var(--font-display)", color: "#4ade80" }}
              >
                {stat.value}
              </div>
              <div
                className="text-xs uppercase tracking-widest"
                style={{ color: "rgba(232,237,233,0.25)", fontFamily: "var(--font-body)" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form, theme-aware ─────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        style={{ background: "var(--wm-bg)" }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden mb-10 rk-fade-in">
          <Link href="/" className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none" style={{ color: "var(--wm-accent)" }}>
              <line x1="24" y1="24" x2="24" y2="46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="24" r="3" fill="currentColor" />
              <g style={{ transformOrigin: "24px 24px" }}>
                <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" />
                <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(120 24 24)" />
                <ellipse cx="24" cy="15" rx="2.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(240 24 24)" />
              </g>
            </svg>
            <span
              className="text-xl font-semibold cursor-pointer"
              style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
            >
              Windmill
            </span>
          </Link>
        </div>

        {/* Form card */}
        <div
          className="w-full max-w-[400px] rounded-2xl p-8 sm:p-10"
          style={{
            background: "var(--wm-surface)",
            border: "1px solid var(--wm-border-md)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
