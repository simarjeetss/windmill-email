"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { login } from "@/lib/supabase/actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      {/* Heading */}
      <div className="rk-fade-up mb-8">
        <h1
          className="text-3xl font-medium mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
        >
          Welcome back
        </h1>
        <p className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
          Sign in to your ReachKit account
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rk-fade-up rk-delay-1 space-y-1">
          <label
            htmlFor="email"
            className="block text-xs uppercase tracking-widest"
            style={{ color: "var(--rk-text-muted)" }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="rk-auth-input"
          />
        </div>

        <div className="rk-fade-up rk-delay-2 space-y-1">
          <label
            htmlFor="password"
            className="block text-xs uppercase tracking-widest"
            style={{ color: "var(--rk-text-muted)" }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            className="rk-auth-input"
          />
        </div>

        {/* Error */}
        {error && (
          <div
            className="rk-fade-in rounded-lg px-4 py-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        <div className="rk-fade-up rk-delay-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rk-btn-gold"
            style={{ opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="rk-fade-up rk-delay-4 flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: "var(--rk-border)" }} />
        <span className="text-xs" style={{ color: "var(--rk-text-sub)" }}>
          or
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--rk-border)" }} />
      </div>

      {/* Switch */}
      <div className="rk-fade-up rk-delay-5">
        <Link href="/signup" className="block">
          <button type="button" className="rk-btn-ghost">
            Don&apos;t have an account?{" "}
            <span style={{ color: "var(--rk-gold)" }}>Create one</span>
          </button>
        </Link>
      </div>

      <p
        className="rk-fade-up rk-delay-5 mt-8 text-center text-xs"
        style={{ color: "var(--rk-text-sub)" }}
      >
        By signing in you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
