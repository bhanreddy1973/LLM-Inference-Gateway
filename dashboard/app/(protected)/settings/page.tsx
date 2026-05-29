"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Shield, Calendar, Zap, Database, Clock } from "lucide-react";

const TIER_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  enterprise: { label: "Enterprise", color: "#fbbf24", bg: "rgba(217,119,6,0.12)",  border: "rgba(217,119,6,0.25)" },
  pro:        { label: "Pro",        color: "#a78bfa", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.25)" },
  free:       { label: "Free",       color: "#22d3ee", bg: "rgba(8,145,178,0.12)",  border: "rgba(8,145,178,0.25)" },
};

const TIER_LIMITS: Record<string, { rpm: number; rpd: string; tokens: number }> = {
  free:       { rpm: 10,  rpd: "100",       tokens: 1_024 },
  pro:        { rpm: 60,  rpd: "5,000",     tokens: 4_096 },
  enterprise: { rpm: 300, rpd: "Unlimited", tokens: 8_192 },
};

export default function SettingsPage() {
  const { user: ctxUser } = useAuth();
  const { data: user } = useSWR("me", () => authApi.me(), { fallbackData: ctxUser ?? undefined });

  const tier   = user?.tier ?? "free";
  const ts     = TIER_STYLES[tier] ?? TIER_STYLES.free;
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          {/* Avatar + name row */}
          <div className="flex items-center gap-5 pb-5 mb-5 border-b border-border/50">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
              style={{
                background: "linear-gradient(135deg, #6d28d9, #0891b2)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(109,40,217,0.3)",
              }}
            >
              {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {user?.name ?? "—"}
              </p>
              <p className="text-sm mt-0.5 text-muted-foreground">{user?.email}</p>
              <Badge
                variant="outline"
                className="mt-1.5 h-auto text-xs font-bold"
                style={{ background: ts.bg, color: ts.color, borderColor: ts.border }}
              >
                {ts.label} Plan
              </Badge>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { Icon: User,     label: "Full Name",    value: user?.name ?? "—" },
              { Icon: Mail,     label: "Email",        value: user?.email ?? "—" },
              { Icon: Shield,   label: "Account ID",   value: user?.id ? `${user.id.slice(0, 8)}…` : "—" },
              { Icon: Calendar, label: "Member Since", value: user?.created_at ? formatDateTime(user.created_at) : "—" },
            ].map(({ Icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/50"
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium mt-0.5 truncate text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Plan Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { Icon: Zap,      label: "Req / min",       value: limits.rpm.toString(),         color: "#a78bfa" },
              { Icon: Clock,    label: "Req / day",        value: limits.rpd,                    color: "#22d3ee" },
              { Icon: Database, label: "Max tokens / req", value: limits.tokens.toLocaleString(), color: "#34d399" },
            ].map(({ Icon, label, value, color }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center p-4 rounded-xl text-center"
                style={{ background: `${color}0c`, border: `1px solid ${color}22` }}
              >
                <Icon className="w-4 h-4 mb-2" style={{ color }} strokeWidth={1.8} />
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs mt-0.5 text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {tier !== "enterprise" && (
            <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-primary/6 border border-primary/18">
              <p className="text-xs text-muted-foreground">
                Need higher limits? Upgrade your plan.
              </p>
              <Badge variant="secondary" className="bg-primary/18 text-violet-300 cursor-default">
                Upgrade →
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
