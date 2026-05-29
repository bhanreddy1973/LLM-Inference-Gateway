"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LiquidBg } from "@/components/liquid-bg";
import { useAuth } from "@/lib/auth";
import { authApi, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Zap, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

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

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <LiquidBg />

      <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{
              background: "linear-gradient(135deg, rgba(6,182,212,0.35), rgba(16,185,129,0.25))",
              border: "1px solid rgba(6,182,212,0.35)",
              boxShadow: "0 0 40px rgba(6,182,212,0.25), 0 0 16px rgba(6,182,212,0.15) inset",
            }}
          >
            <Zap className="w-7 h-7 text-cyan-300" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold gradient-text tracking-tight">Create Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join LLM Gateway — free tier included
          </p>
        </div>

        {/* Card */}
        <Card className="glass-card border-cyan-500/18 shadow-[0_0_40px_rgba(6,182,212,0.12),0_24px_64px_rgba(0,0,0,0.5)]">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Smith"
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  <Input
                    type={showPw ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="pl-10 pr-10 h-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Free tier info */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-500/6 border border-cyan-500/15">
                <Badge
                  variant="outline"
                  className="h-auto text-[10px] font-bold tracking-wider shrink-0 bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                >
                  FREE
                </Badge>
                <span className="text-xs text-muted-foreground">
                  10 req/min · 100 req/day · 1,024 tokens max
                </span>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl p-3.5 text-sm flex items-start gap-2.5 bg-destructive/8 border border-destructive/22 text-red-300 animate-in zoom-in-95 duration-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-gradient-to-r from-cyan-700 to-emerald-800 hover:from-cyan-600 hover:to-emerald-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground/30">OR</span>
              <Separator className="flex-1" />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-cyan-400 hover:opacity-80 transition-opacity">
                Sign in →
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs mt-6 text-muted-foreground/30">
          LLM Inference Gateway v1.0 · Self-hosted
        </p>
      </div>
    </div>
  );
}
