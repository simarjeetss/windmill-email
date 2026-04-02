"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signup } from "@/lib/supabase/actions";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="rk-fade-up text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
          style={{
            background: "var(--rk-gold-dim)",
            border: "1px solid rgba(212,168,83,0.3)",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--rk-gold)" }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2
          className="text-2xl font-medium mb-3"
          style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
        >
          Check your inbox
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--rk-text-muted)" }}>
          We&apos;ve sent a confirmation link to your email. Click it to activate
          your account.
        </p>
        <Link href="/login">
          <button type="button" className="rk-btn-ghost">
            Back to sign in
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Heading */}
      <div className="rk-fade-up mb-8">
        <h1
          className="text-3xl font-medium mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
        >
          Create an account
        </h1>
        <p className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
          Start building your outreach campaigns today
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
            autoComplete="new-password"
            placeholder="Min. 6 characters"
            className="rk-auth-input"
          />
        </div>

        <div className="rk-fade-up rk-delay-3 space-y-1">
          <label
            htmlFor="confirm"
            className="block text-xs uppercase tracking-widest"
            style={{ color: "var(--rk-text-muted)" }}
          >
            Confirm Password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Repeat password"
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

        <div className="rk-fade-up rk-delay-4 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rk-btn-gold"
            style={{ opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="rk-fade-up rk-delay-5 flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: "var(--rk-border)" }} />
        <span className="text-xs" style={{ color: "var(--rk-text-sub)" }}>
          or
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--rk-border)" }} />
      </div>

      {/* Switch */}
      <div className="rk-fade-up rk-delay-5">
        <Link href="/login" className="block">
          <button type="button" className="rk-btn-ghost">
            Already have an account?{" "}
            <span style={{ color: "var(--rk-gold)" }}>Sign in</span>
          </button>
        </Link>
      </div>

      <p
        className="rk-fade-up rk-delay-5 mt-8 text-center text-xs"
        style={{ color: "var(--rk-text-sub)" }}
      >
        By signing up you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
