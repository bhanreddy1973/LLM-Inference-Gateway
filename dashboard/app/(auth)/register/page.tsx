"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LiquidBg } from "@/components/liquid-bg";
import { useAuth } from "@/lib/auth";
import { authApi, ApiError } from "@/lib/api";
import { Zap, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.register({ name, email, password });
      const token = await authApi.login({ email, password });
      const user  = await authApi.me();
      login(token.access_token, user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  function inputStyle(field: string): React.CSSProperties {
    const active = focused === field;
    return {
      background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${active ? "rgba(6,182,212,0.45)" : "rgba(255,255,255,0.09)"}`,
      color: "var(--color-foreground)",
      paddingLeft: "2.5rem",
      paddingRight: field === "password" ? "2.5rem" : "1rem",
      boxShadow: active ? "0 0 0 3px rgba(6,182,212,0.12)" : "none",
      transition: "all 0.2s ease",
    };
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <LiquidBg />

      <div
        className="relative w-full max-w-sm"
        style={{ animation: "stagger-in 0.6s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* ── Logo ── */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{
              background: "linear-gradient(135deg, rgba(6,182,212,0.35), rgba(16,185,129,0.25))",
              border: "1px solid rgba(6,182,212,0.35)",
              boxShadow: "0 0 40px rgba(6,182,212,0.25), 0 0 16px rgba(6,182,212,0.15) inset",
            }}
          >
            <Zap className="w-7 h-7" style={{ color: "#22d3ee" }} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold gradient-text tracking-tight">Create Account</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-muted-foreground)" }}>
            Join LLM Gateway — free tier included
          </p>
        </div>

        {/* ── Card ── */}
        <div
          className="glass-card p-8"
          style={{
            boxShadow: "0 0 40px rgba(6,182,212,0.12), 0 0 0 1px rgba(6,182,212,0.12) inset, 0 24px 64px rgba(0,0,0,0.5)",
            border: "1px solid rgba(6,182,212,0.18)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                Full Name
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: focused === "name" ? "#22d3ee" : "var(--color-muted-foreground)", transition: "color 0.2s" }}
                />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  placeholder="Alex Smith"
                  className="w-full py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle("name")}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: focused === "email" ? "#22d3ee" : "var(--color-muted-foreground)", transition: "color 0.2s" }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  placeholder="you@example.com"
                  className="w-full py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle("email")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: focused === "password" ? "#22d3ee" : "var(--color-muted-foreground)", transition: "color 0.2s" }}
                />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="Min. 8 characters"
                  className="w-full py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors duration-200"
                  style={{ color: "var(--color-muted-foreground)" }}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Free tier info */}
            <div
              className="flex items-center gap-2.5 p-3 rounded-xl"
              style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}
            >
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 tracking-wider"
                style={{ background: "rgba(6,182,212,0.15)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)" }}
              >
                FREE
              </span>
              <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                10 req/min · 100 req/day · 1,024 tokens max
              </span>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl p-3.5 text-sm flex items-start gap-2.5"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  color: "#fca5a5",
                  animation: "scale-in 0.3s cubic-bezier(0.16,1,0.3,1) both",
                }}
              >
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #0e7490, #065f46)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(6,182,212,0.3), 0 1px 0 rgba(255,255,255,0.08) inset",
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 32px rgba(6,182,212,0.5), 0 4px 12px rgba(0,0,0,0.3)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(6,182,212,0.3), 0 1px 0 rgba(255,255,255,0.08) inset"; }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>OR</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          <p className="text-center text-sm" style={{ color: "var(--color-muted-foreground)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: "#22d3ee" }}>
              Sign in →
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.15)" }}>
          LLM Inference Gateway v1.0 · Self-hosted
        </p>
      </div>
    </div>
  );
}
