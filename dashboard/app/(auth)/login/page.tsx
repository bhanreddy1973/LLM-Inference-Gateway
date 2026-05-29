"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { authApi, ApiError } from "@/lib/api";
import { Meteors } from "@/components/magicui/meteors";
import { BorderBeam } from "@/components/magicui/border-beam";
import { TextEffect } from "@/components/motion/text-effect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff,
  AlertTriangle, Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
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
      const token = await authApi.login({ email, password });
      const user  = await authApi.me(token.access_token);
      login(token.access_token, user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Check the gateway is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#030108]">
      {/* === LEFT PANEL — Branding === */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12">
        {/* Background layers */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 80% at 50% 40%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 20% 80%, rgba(6,182,212,0.08) 0%, transparent 50%), #030108",
          }}
        />

        {/* Meteors from MagicUI */}
        <div className="absolute inset-0 overflow-hidden">
          <Meteors number={25} angle={200} minDuration={4} maxDuration={12} />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-md">
          {/* Floating logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.6), rgba(6,182,212,0.5))",
                boxShadow: "0 0 80px rgba(139,92,246,0.3), 0 0 30px rgba(139,92,246,0.2) inset",
              }}
            >
              <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
              <div
                className="absolute inset-0 rounded-2xl animate-[spin-slow_6s_linear_infinite] opacity-40"
                style={{
                  background: "conic-gradient(from 0deg, transparent 60%, rgba(167,139,250,0.5) 80%, transparent 100%)",
                }}
              />
            </div>
          </motion.div>

          {/* Title with TextEffect from motion-primitives */}
          <div className="space-y-4">
            <TextEffect
              preset="blur"
              per="word"
              delay={0.2}
              className="text-4xl font-bold tracking-tight text-white"
              as="h1"
            >
              Unified Inference Gateway
            </TextEffect>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-base text-white/40 leading-relaxed"
            >
              Route, monitor, and optimize your LLM requests across multiple providers
              through a single powerful API.
            </motion.p>
          </div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-wrap gap-2 mt-8"
          >
            {["Multi-Provider", "Real-time Analytics", "Cost Tracking", "Auto-failover"].map((feature, i) => (
              <motion.span
                key={feature}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.1, duration: 0.4 }}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-white/50 backdrop-blur-sm"
              >
                {feature}
              </motion.span>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/[0.06]"
          >
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "<50ms", label: "Overhead" },
              { value: "5+", label: "Providers" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-bold text-white/90">{stat.value}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* === RIGHT PANEL — Login Form === */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Subtle gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 70% 30%, rgba(139,92,246,0.05) 0%, transparent 50%), #050510",
          }}
        />

        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-6 left-6 flex items-center gap-2.5 lg:hidden"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.5), rgba(6,182,212,0.4))",
            }}
          >
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-white/90">LLM Gateway</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[400px] z-10"
        >
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-sm text-white/40 mt-2">
              Enter your credentials to access the dashboard
            </p>
          </div>

          {/* Card with BorderBeam from MagicUI */}
          <div className="relative rounded-2xl">
            <BorderBeam
              size={80}
              duration={8}
              colorFrom="#a78bfa"
              colorTo="#22d3ee"
              borderWidth={1}
            />

            <div
              className="relative rounded-2xl p-8 overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
              }}
            >
              {/* Inner glow */}
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 60%)",
                }}
              />

              <form onSubmit={handleSubmit} className="relative space-y-5">
                {/* Email field */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200"
                      style={{ color: focused === "email" ? "#a78bfa" : "rgba(255,255,255,0.25)" }}
                    />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      placeholder="you@company.com"
                      className="pl-11 h-12 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-violet-500/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30">
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-[11px] text-violet-400/70 hover:text-violet-300 transition-colors"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200"
                      style={{ color: focused === "password" ? "#a78bfa" : "rgba(255,255,255,0.25)" }}
                    />
                    <Input
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      placeholder="••••••••••"
                      className="pl-11 pr-11 h-12 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-violet-500/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-white/25 hover:text-white/60 transition-colors"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="rounded-xl p-3.5 text-[13px] flex items-start gap-2.5 bg-rose-500/8 border border-rose-500/15 text-rose-200"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span className="leading-snug">{error}</span>
                  </motion.div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-semibold text-sm border-0 relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)",
                    boxShadow: "0 0 20px rgba(124,58,237,0.3), 0 8px 24px rgba(124,58,237,0.2)",
                  }}
                >
                  {/* Button shimmer */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
                    }}
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-4 py-1">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">or continue with</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Social buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/60 text-sm font-medium hover:bg-white/[0.05] hover:border-white/[0.12] hover:text-white/80 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/60 text-sm font-medium hover:bg-white/[0.05] hover:border-white/[0.12] hover:text-white/80 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-white/40 mt-8">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
            >
              Sign up free
            </Link>
          </p>

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            <Sparkles className="w-3 h-3 text-white/15" />
            <p className="text-[11px] text-white/15">
              LLM Inference Gateway v1.0
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
