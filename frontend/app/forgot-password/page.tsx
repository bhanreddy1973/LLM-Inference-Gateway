"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate a short delay — real impl would call POST /v1/auth/forgot-password
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#09090b]">
      {/* Grid + glows */}
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
        {sent ? (
          /* ── Sent confirmation ── */
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <CheckCircle2 className="size-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-zinc-50">Check your email</h1>
              <p className="mt-2 text-[13px] text-zinc-500">
                If an account exists for <span className="text-zinc-300">{email}</span>, we sent a password reset link. Check your inbox (and spam).
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Link
                href="/login"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-50 text-sm font-semibold text-zinc-900 transition hover:-translate-y-0.5 hover:bg-white"
              >
                Back to sign in
              </Link>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-[13px] text-zinc-600 hover:text-zinc-400"
              >
                Try a different email
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <Link href="/login" className="flex items-center gap-1.5 text-[12px] text-zinc-600 transition hover:text-zinc-400 w-fit">
                <ArrowLeft className="size-3.5" /> Back to sign in
              </Link>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-zinc-50">Reset your password</h1>
              <p className="text-sm text-zinc-500">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[13px] font-medium text-zinc-400">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoFocus
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-zinc-50 placeholder:text-zinc-600 transition focus:border-white/20 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-white/10"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-50 text-sm font-semibold text-zinc-900 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_30px_-6px_rgba(255,255,255,0.15)] disabled:pointer-events-none disabled:opacity-50"
              >
                {loading
                  ? <Loader2 className="size-4 animate-spin" />
                  : <><span>Send reset link</span><ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" /></>}
              </button>
            </form>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[12px] text-zinc-600">
              <p className="font-medium text-zinc-500 mb-1">Self-hosted instance?</p>
              Reset your password directly via the Settings page once signed in, or ask your instance admin to reset it via the backend.
            </div>
          </div>
        )}
      </div>

      <p className="absolute bottom-8 text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} Acheron. All rights reserved.
      </p>
    </div>
  );
}
