"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { resetPassword, ApiError } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // No token in URL
  if (!token) {
    return (
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <ShieldAlert className="size-8 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-zinc-50">Invalid reset link</h1>
          <p className="mt-2 text-[13px] text-zinc-500">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-50 px-6 text-sm font-semibold text-zinc-900 transition hover:-translate-y-0.5 hover:bg-white"
        >
          Request new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token!, password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
          <CheckCircle2 className="size-8 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-zinc-50">Password reset</h1>
          <p className="mt-2 text-[13px] text-zinc-500">
            Your password has been updated successfully. You can now sign in with your new password.
          </p>
        </div>
        <Link
          href="/login"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-50 text-sm font-semibold text-zinc-900 transition hover:-translate-y-0.5 hover:bg-white"
        >
          Sign in
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-zinc-50">Choose a new password</h1>
        <p className="text-sm text-zinc-500">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-[13px] font-medium text-zinc-400">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 pr-11 text-sm text-zinc-50 placeholder:text-zinc-600 transition focus:border-white/20 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-white/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 transition hover:text-zinc-400"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className="text-[13px] font-medium text-zinc-400">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
            minLength={8}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-zinc-50 placeholder:text-zinc-600 transition focus:border-white/20 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-white/10"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-50 text-sm font-semibold text-zinc-900 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_30px_-6px_rgba(255,255,255,0.15)] disabled:pointer-events-none disabled:opacity-50"
        >
          {loading
            ? <Loader2 className="size-4 animate-spin" />
            : <><span>Reset password</span><ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" /></>}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#09090b]">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black_20%,transparent_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.55_0.15_250/0.1)_0%,transparent_70%)] blur-3xl" />

      {/* Logo */}
      <Link href="/" className="absolute left-8 top-8 flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-zinc-50 transition hover:text-white">
        <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14.9282 5V11L8 15L1.07179 11V5L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 5L11.4641 7V9L8 11L4.53589 9V7L8 5Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </div>
        Acheron
      </Link>

      <div className="relative z-10 w-full max-w-[400px] px-6">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-zinc-500" />
          </div>
        }>
          <ResetPasswordContent />
        </Suspense>
      </div>

      <p className="absolute bottom-8 text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} Acheron. All rights reserved.
      </p>
    </div>
  );
}
