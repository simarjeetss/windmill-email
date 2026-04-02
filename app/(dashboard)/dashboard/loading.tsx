export default function DashboardSectionLoading() {
  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] flex items-center justify-center">
      <div className="rk-fade-in flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: "3px solid rgba(212,168,83,0.15)" }}
          />
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "3px solid transparent", borderTopColor: "var(--rk-gold)", borderRightColor: "var(--rk-gold-light)" }}
          />
          <div
            className="absolute inset-2 rounded-full"
            style={{ border: "2px solid rgba(212,168,83,0.12)" }}
          />
        </div>
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--rk-text-sub)" }}>
          Loading
        </div>
      </div>
    </div>
  );
}
