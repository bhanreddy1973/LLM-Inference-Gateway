"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Key,
  Loader2,
  Lock,
  Shield,
  User,
  Zap,
} from "lucide-react";
import { getMe, updateMe, type UserResponse } from "@/lib/api";

// ─── Tier config (mirrors backend) ───────────────────────────────────────────

const TIER_LIMITS: Record<string, { rpm: number; rpd: number | null; mtr: number; color: string; badge: string }> = {
  free:       { rpm: 10,  rpd: 100,  mtr: 1024, color: "zinc",    badge: "text-zinc-400 bg-zinc-500/10 ring-zinc-500/20" },
  pro:        { rpm: 60,  rpd: 5000, mtr: 4096, color: "blue",    badge: "text-blue-400 bg-blue-500/10 ring-blue-500/20" },
  enterprise: { rpm: 300, rpd: null, mtr: 8192, color: "violet",  badge: "text-violet-400 bg-violet-500/10 ring-violet-500/20" },
};

function getTierInfo(tier: string) {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <p className="text-[13px] font-semibold text-zinc-200">{title}</p>
        {sub && <p className="mt-0.5 text-[12px] text-zinc-600">{sub}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, disabled }: {
  value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[13px] text-zinc-200 placeholder:text-zinc-700 transition focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 disabled:opacity-50"
    />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-[13px] shadow-2xl " +
        (type === "success"
          ? "border-emerald-500/20 bg-[#0a1a12] text-emerald-300"
          : "border-red-500/20 bg-[#1a0a0a] text-red-300")
      }
    >
      {type === "success"
        ? <Check className="size-4 text-emerald-400" />
        : <AlertTriangle className="size-4 text-red-400" />}
      {msg}
    </div>
  );
}

// ─── Limit row ────────────────────────────────────────────────────────────────

function LimitRow({ label, limit }: { label: string; limit: number | null }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono font-medium text-zinc-300">
        {limit === null ? "Unlimited" : limit.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [user, setUser]           = useState<UserResponse | null>(null);
  const [loading, setLoading]     = useState(true);

  // Profile form
  const [name, setName]           = useState("");
  const [nameLoading, setNL]      = useState(false);

  // Password form
  const [curPw, setCurPw]         = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPWL]       = useState(false);

  // Toast
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Set page title
  useEffect(() => { document.title = "Settings · Acheron"; }, []);

  useEffect(() => {
    getMe()
      .then((u) => { setUser(u); setName(u.name); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveName() {
    if (!name.trim() || name === user?.name) return;
    setNL(true);
    try {
      const u = await updateMe({ name: name.trim() });
      setUser(u);
      showToast("Name updated.", "success");
    } catch {
      showToast("Failed to update name.", "error");
    } finally {
      setNL(false);
    }
  }

  async function savePassword() {
    if (!curPw || !newPw) return;
    if (newPw !== confirmPw) { showToast("New passwords don't match.", "error"); return; }
    if (newPw.length < 8) { showToast("Password must be at least 8 characters.", "error"); return; }
    setPWL(true);
    try {
      await updateMe({ current_password: curPw, new_password: newPw });
      setCurPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed.", "success");
    } catch (e: unknown) {
      const msg = (e as { detail?: string }).detail ?? "Failed to change password.";
      showToast(msg, "error");
    } finally {
      setPWL(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  const tier = user?.tier ?? "free";
  const tierInfo = getTierInfo(tier);

  return (
    <div className="min-h-screen px-8 py-8">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-zinc-50">Settings</h1>
        <p className="mt-0.5 text-[13px] text-zinc-600">
          Manage your account, tier limits, and security.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-6">

          {/* Profile */}
          <Section title="Profile" sub="Your display name and email address">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-[20px] font-bold text-violet-300 ring-1 ring-violet-500/20">
                  {user?.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-zinc-100">{user?.name}</p>
                  <p className="text-[13px] text-zinc-500">{user?.email}</p>
                </div>
              </div>

              <Field label="Display name">
                <div className="flex gap-2">
                  <Input value={name} onChange={setName} placeholder="Your name" />
                  <button
                    onClick={saveName}
                    disabled={nameLoading || name === user?.name || !name.trim()}
                    className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {nameLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Save
                  </button>
                </div>
              </Field>

              <Field label="Email address">
                <Input value={user?.email ?? ""} onChange={() => {}} disabled />
                <p className="text-[11px] text-zinc-700">Email cannot be changed.</p>
              </Field>

              <Field label="Account created">
                <p className="text-[13px] text-zinc-500">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("en", { dateStyle: "long" }) : "—"}
                </p>
              </Field>
            </div>
          </Section>

          {/* Password */}
          <Section title="Change Password" sub="Use a strong password with at least 8 characters">
            <div className="flex flex-col gap-4">
              <Field label="Current password">
                <Input type="password" value={curPw} onChange={setCurPw} placeholder="••••••••" />
              </Field>
              <Field label="New password">
                <Input type="password" value={newPw} onChange={setNewPw} placeholder="••••••••" />
              </Field>
              <Field label="Confirm new password">
                <div className="flex gap-2">
                  <Input type="password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />
                  <button
                    onClick={savePassword}
                    disabled={pwLoading || !curPw || !newPw || !confirmPw}
                    className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {pwLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
                    Update
                  </button>
                </div>
              </Field>
            </div>
          </Section>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">

          {/* Tier */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-zinc-200">Current Plan</p>
                <span className={"rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset " + tierInfo.badge}>
                  {tier}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-5 flex flex-col gap-3">
                <LimitRow label="Requests / minute" limit={tierInfo.rpm} />
                <LimitRow label="Requests / day"    limit={tierInfo.rpd} />
                <LimitRow label="Max tokens / req"  limit={tierInfo.mtr} />
              </div>
              <p className="text-[11px] text-zinc-700">
                Individual API keys can have lower limits set below. To upgrade this account&apos;s tier, update the <code className="rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-400">tier</code> column in the database or use the admin API.
              </p>
            </div>
          </div>

          {/* Quick links */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-[13px] font-semibold text-zinc-200">Quick Links</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: "Manage API Keys", sub: "Create keys with custom limits", icon: Key,    href: "/dashboard/keys" },
                { label: "View Analytics",  sub: "Token usage, cost, latency",     icon: Zap,    href: "/dashboard/usage" },
                { label: "Request Logs",    sub: "Full request history",           icon: Shield,  href: "/dashboard/logs" },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.02]"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.04]">
                    <l.icon className="size-4 text-zinc-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-zinc-300">{l.label}</p>
                    <p className="text-[11px] text-zinc-600">{l.sub}</p>
                  </div>
                  <ChevronRight className="size-3.5 text-zinc-700" />
                </a>
              ))}
            </div>
          </div>

          {/* Account info */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e] p-5">
            <div className="mb-3 flex items-center gap-2">
              <User className="size-4 text-zinc-600" />
              <p className="text-[13px] font-semibold text-zinc-300">Account</p>
            </div>
            <div className="flex flex-col gap-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-zinc-600">User ID</span>
                <span className="font-mono text-zinc-500">{user?.id?.slice(0, 8)}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Status</span>
                <span className={user?.is_active ? "text-emerald-400" : "text-red-400"}>
                  {user?.is_active ? "Active" : "Suspended"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Tier</span>
                <span className="capitalize text-zinc-400">{tier}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
