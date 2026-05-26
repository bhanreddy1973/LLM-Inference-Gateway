"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { formatDateTime, tierColor } from "@/lib/utils";
import { User, Mail, Shield, Calendar, Zap, Database, Clock } from "lucide-react";

const TIER_LIMITS: Record<string, { rpm: number; rpd: string; tokens: number }> = {
  free:       { rpm: 10,  rpd: "100",       tokens: 1_024 },
  pro:        { rpm: 60,  rpd: "5,000",     tokens: 4_096 },
  enterprise: { rpm: 300, rpd: "Unlimited", tokens: 8_192 },
};

export default function SettingsPage() {
  const { user: ctxUser } = useAuth();
  const { data: user } = useSWR("me", () => authApi.me(), { fallbackData: ctxUser ?? undefined });

  const tier = user?.tier ?? "free";
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const tc = tierColor(tier);

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>Account details and plan information</p>
      </div>

      {/* Profile card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-5 mb-6 pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #0e7490)", color: "#fff", boxShadow: "0 0 24px rgba(139,92,246,0.3)" }}>
            {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>{user?.name ?? "—"}</p>
            <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>{user?.email}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${tc}`} style={{ background: "rgba(255,255,255,0.06)" }}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: User,     label: "Full Name",    value: user?.name ?? "—" },
            { icon: Mail,     label: "Email",        value: user?.email ?? "—" },
            { icon: Shield,   label: "Account ID",   value: user?.id ? `${user.id.slice(0, 8)}…` : "—" },
            { icon: Calendar, label: "Member since", value: user?.created_at ? formatDateTime(user.created_at) : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--color-muted-foreground)" }} />
              <div>
                <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "var(--color-foreground)" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan limits */}
      <div className="glass-card p-6">
        <p className="text-sm font-semibold mb-5" style={{ color: "var(--color-foreground)" }}>Plan Limits</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Zap,      label: "Requests / min",  value: limits.rpm.toString(),    color: "#a78bfa" },
            { icon: Clock,    label: "Requests / day",  value: limits.rpd,               color: "#22d3ee" },
            { icon: Database, label: "Max tokens / req", value: limits.tokens.toLocaleString(), color: "#34d399" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="p-4 rounded-xl text-center" style={{ background: `${color}0d`, border: `1px solid ${color}25` }}>
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
            </div>
          ))}
        </div>

        {tier !== "enterprise" && (
          <div className="mt-4 p-3 rounded-xl flex items-center justify-between" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
              Need higher limits? Upgrade your plan.
            </p>
            <span className="text-xs font-medium px-3 py-1 rounded-lg" style={{ background: "rgba(139,92,246,0.2)", color: "#a78bfa", cursor: "default" }}>
              Upgrade →
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
