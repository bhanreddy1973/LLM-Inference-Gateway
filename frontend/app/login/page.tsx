"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import {
  login,
  saveToken,
  ApiError,
  getGoogleOAuthUrl,
  getGitHubOAuthUrl,
  exchangeOAuthCode,
} from "@/lib/api";

// ─── OAuth Button ─────────────────────────────────────────────────────────────
function OAuthButton({
  icon,
  label,
  onClick,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-zinc-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Handle OAuth callback (code in URL query params)
  const handleOAuthCallback = async (provider: "google" | "github", code: string) => {
    setOauthLoading(provider);
    setError("");
    try {
      const redirectUri = `${window.location.origin}/login?provider=${provider}`;
      const data = await exchangeOAuthCode(provider, code, redirectUri);
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("OAuth authentication failed. Please try again.");
      }
      // Clean up URL
      window.history.replaceState({}, "", "/login");
    } finally {
      setOauthLoading(null);
    }
  };

  useEffect(() => {
    const code = searchParams.get("code");
    const provider = searchParams.get("provider") as "google" | "github" | null;

    if (code && provider) {
      handleOAuthCallback(provider, code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleGoogleLogin() {
    setError("");
    setOauthLoading("google");
    try {
      const { url } = await getGoogleOAuthUrl();
      window.location.href = url;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Google login is not available right now.");
      }
      setOauthLoading(null);
    }
  }

  async function handleGitHubLogin() {
    setError("");
    setOauthLoading("github");
    try {
      const { url } = await getGitHubOAuthUrl();
      window.location.href = url;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("GitHub login is not available right now.");
      }
      setOauthLoading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await login(email, password);
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-zinc-50">
          Welcome back
        </h1>
        <p className="text-sm text-zinc-500">
          Sign in to your account to continue
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* OAuth Buttons */}
      <div className="flex flex-col gap-3">
        <OAuthButton
          label="Continue with Google"
          loading={oauthLoading === "google"}
          onClick={handleGoogleLogin}
          icon={
            <svg className="size-4" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          }
        />
        <OAuthButton
          label="Continue with GitHub"
          loading={oauthLoading === "github"}
          onClick={handleGitHubLogin}
          icon={
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          }
        />
      </div>

      {/* Divider */}
      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[13px] font-medium text-zinc-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
            className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-zinc-50 placeholder:text-zinc-600 transition-colors focus:border-white/20 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-white/10"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[13px] font-medium text-zinc-400">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[13px] text-zinc-500 transition hover:text-zinc-300"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 pr-11 text-sm text-zinc-50 placeholder:text-zinc-600 transition-colors focus:border-white/20 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-white/10"
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

        <button
          type="submit"
          disabled={isLoading}
          className="group relative mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-50 text-sm font-semibold text-zinc-900 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_30px_-6px_rgba(255,255,255,0.15)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-zinc-300 transition hover:text-white">
          Create one
        </Link>
      </p>

      {/* Demo mode */}
      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem("demo_mode", "true");
          window.location.href = "/dashboard?demo=1";
        }}
        className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-sm font-medium text-zinc-500 transition-all hover:border-white/20 hover:bg-white/[0.04] hover:text-zinc-300"
      >
        <svg className="size-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Explore Demo Dashboard
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#09090b]">
      {/* Ambient background effects */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black_20%,transparent_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.55_0.15_250/0.12)_0%,transparent_70%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.6_0.18_280/0.08)_0%,transparent_70%)] blur-3xl"
        aria-hidden="true"
      />

      {/* Logo */}
      <Link
        href="/"
        className="absolute left-8 top-8 flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-zinc-50 transition hover:text-white"
      >
        <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14.9282 5V11L8 15L1.07179 11V5L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 5L11.4641 7V9L8 11L4.53589 9V7L8 5Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </div>
        Acheron
      </Link>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[400px] px-6">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-zinc-500" />
          </div>
        }>
          <LoginContent />
        </Suspense>
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} Acheron. All rights reserved.
      </p>
    </div>
  );
}
