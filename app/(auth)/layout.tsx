import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--rk-bg)" }}
    >
      {/* ── Left panel — always dark, decorative ────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between p-14"
        style={{
          background: "linear-gradient(145deg, #111009 0%, #0d0d0f 50%, #131110 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Ambient gold glow — top left */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "-60px", left: "-60px",
            width: "500px", height: "500px",
            background: "radial-gradient(circle, rgba(212,168,83,0.1) 0%, transparent 65%)",
          }}
        />
        {/* Ambient gold glow — bottom right */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            bottom: "-40px", right: "-40px",
            width: "380px", height: "380px",
            background: "radial-gradient(circle, rgba(212,168,83,0.07) 0%, transparent 65%)",
          }}
        />

        {/* Subtle dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Logo — always light text on dark bg */}
        <div className="rk-fade-up relative z-10">
          <Link href="/">
            <span
              className="text-2xl font-bold tracking-tight cursor-pointer"
              style={{ fontFamily: "var(--font-display)", color: "#f0ede8" }}
            >
              ReachKit<span style={{ color: "#d4a853" }}>.ai</span>
            </span>
          </Link>
        </div>

        {/* Central quote */}
        <div className="relative z-10 max-w-md">
          <div
            className="rk-fade-up rk-delay-1 mb-8 w-10 h-[2px]"
            style={{ background: "#d4a853" }}
          />
          <blockquote
            className="rk-fade-up rk-delay-2 mb-5 text-[2.15rem] font-medium leading-[1.18]"
            style={{
              fontFamily: "var(--font-display)",
              color: "#f0ede8",
              fontStyle: "italic",
              letterSpacing: "-0.01em",
            }}
          >
            &ldquo;The right email, to the right person, at exactly the right moment.&rdquo;
          </blockquote>
          <p
            className="rk-fade-up rk-delay-3 text-sm"
            style={{ color: "rgba(240,237,232,0.45)", fontFamily: "var(--font-body)" }}
          >
            AI-powered outreach that learns your voice
          </p>
        </div>

        {/* Bottom stats row */}
        <div className="rk-fade-up rk-delay-4 relative z-10 grid grid-cols-3 gap-6">
          {[
            { value: "GPT-4", label: "Powered" },
            { value: "∞",     label: "Contacts" },
            { value: "Auto",  label: "Follow-ups" },
          ].map((stat) => (
            <div key={stat.label}>
              <div
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "var(--font-display)", color: "#d4a853" }}
              >
                {stat.value}
              </div>
              <div
                className="text-xs uppercase tracking-widest"
                style={{ color: "rgba(240,237,232,0.3)", fontFamily: "var(--font-body)" }}
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
        style={{ background: "var(--rk-bg)" }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden mb-10 rk-fade-in">
          <Link href="/">
            <span
              className="text-2xl font-bold cursor-pointer"
              style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
            >
              ReachKit<span style={{ color: "var(--rk-gold)" }}>.ai</span>
            </span>
          </Link>
        </div>

        {/* Form card with a subtle lift on light mode */}
        <div
          className="w-full max-w-[400px] rounded-2xl p-8 sm:p-10"
          style={{
            background: "var(--rk-surface)",
            border: "1px solid var(--rk-border-md)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
