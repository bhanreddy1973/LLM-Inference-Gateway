"use client";

import useSWR from "swr";
import { healthApi, usageApi } from "@/lib/api";
import { formatRelative, formatLatency, formatNumber } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Server, Radio, BarChart2, Zap, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { HealthStatus, RealtimeStats } from "@/types/api";

const TT = {
  contentStyle: {
    background: "rgba(9,9,29,0.97)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
};

const SERVICES = [
  { key: "postgres",   label: "PostgreSQL",  Icon: Database,  color: "#a78bfa" },
  { key: "redis",      label: "Redis",       Icon: Server,    color: "#22d3ee" },
  { key: "worker",     label: "gRPC Worker", Icon: Radio,     color: "#34d399" },
  { key: "clickhouse", label: "ClickHouse",  Icon: BarChart2, color: "#fbbf24" },
] as const;

function svcColors(status?: string) {
  if (status === "healthy")  return { color: "#34d399", bg: "rgba(52,211,153,0.06)",  border: "rgba(52,211,153,0.18)",  dot: "dot-healthy" };
  if (status === "degraded") return { color: "#fbbf24", bg: "rgba(251,191,36,0.06)",  border: "rgba(251,191,36,0.18)",  dot: "dot-degraded" };
  return                            { color: "#fb7185", bg: "rgba(251,113,133,0.06)", border: "rgba(251,113,133,0.18)", dot: "dot-unhealthy" };
}

function statusChipColor(code: number) {
  const ok   = code < 300;
  const warn = code >= 300 && code < 500;
  return {
    color: ok ? "#34d399" : warn ? "#fbbf24" : "#fb7185",
    bg:    ok ? "rgba(52,211,153,0.1)" : warn ? "rgba(251,191,36,0.1)" : "rgba(251,113,133,0.1)",
  };
}

export default function MonitoringPage() {
  const { data: health } = useSWR<HealthStatus>("health-status", () => healthApi.status(), { refreshInterval: 5_000 });
  const { data: realtime } = useSWR<RealtimeStats>("realtime", () => usageApi.realtime(), { refreshInterval: 5_000 });

  const requests = realtime?.requests ?? [];

  const buckets: { t: string; count: number }[] = [];
  const chunk = Math.max(1, Math.ceil(requests.length / 10));
  for (let i = 0; i < Math.min(requests.length, 30); i += chunk) {
    buckets.push({ t: formatRelative(requests[i]?.created_at ?? new Date().toISOString()), count: chunk });
  }

  const workerSvc = health?.worker;
  const cbState   = (workerSvc as { circuit_breaker?: string })?.circuit_breaker ?? "unknown";

  return (
    <div className="space-y-6">
      {/* Live badge */}
      <div className="flex items-center gap-2.5">
        <span className="dot-live" />
        <span className="text-xs font-medium text-muted-foreground">
          Auto-refreshes every 5s
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Req / 1 min",     value: realtime?.throughput_1m ?? 0,                     Icon: TrendingUp,  color: "#a78bfa" },
          { label: "Req / 5 min",     value: realtime?.throughput_5m ?? 0,                     Icon: Zap,         color: "#22d3ee" },
          { label: "Error rate (1h)", value: `${((realtime?.error_rate_1h ?? 0) * 100).toFixed(1)}%`, Icon: AlertCircle, color: "#fbbf24" },
        ].map(({ label, value, Icon, color }, idx) => (
          <Card
            key={label}
            style={{ animation: `slide-up 0.4s cubic-bezier(0.16,1,0.3,1) ${idx * 60}ms both` }}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}15`, border: `1px solid ${color}28` }}
              >
                <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
                <p className="text-xs mt-0.5 text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service health cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
          Service Health
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SERVICES.map(({ key, label, Icon, color }, idx) => {
            const svc    = health?.[key];
            const status = svc?.status;
            const cfg    = svcColors(status);
            return (
              <div
                key={key}
                className="rounded-xl p-4 transition-all duration-300"
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  animation: `slide-up 0.4s cubic-bezier(0.16,1,0.3,1) ${180 + idx * 50}ms both`,
                }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}15`, border: `1px solid ${color}25` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.8} />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cfg.color }}>
                    <span className={cfg.dot} />
                    {status ?? "unknown"}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">{label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Circuit breaker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Circuit Breaker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {["closed", "half_open", "open"].map((state) => {
              const active = cbState === state;
              const c = state === "closed" ? "#34d399" : state === "half_open" ? "#fbbf24" : "#fb7185";
              return (
                <div
                  key={state}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl flex-1 justify-center transition-all duration-500"
                  style={{
                    background: active ? `${c}10` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? `${c}35` : "rgba(255,255,255,0.05)"}`,
                    boxShadow: active ? `0 0 20px ${c}18` : "none",
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-400"
                    style={{ background: active ? c : "#2a2a40", boxShadow: active ? `0 0 10px ${c}` : "none" }}
                  />
                  <span className="text-sm font-semibold capitalize" style={{ color: active ? c : "var(--color-text-3)" }}>
                    {state.replace("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity chart + live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            <CardTitle className="text-sm">Request Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {buckets.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={buckets} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-live" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="t" tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2}
                    fill="url(#grad-live)" dot={false} activeDot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-44 gap-2 rounded-xl bg-muted/20 border border-dashed border-border/50">
                <Activity className="w-5 h-5 opacity-20" />
                <p className="text-sm text-muted-foreground">Waiting for requests…</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Live Request Feed</CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className="h-auto text-xs font-semibold"
                style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", borderColor: "rgba(52,211,153,0.2)" }}
              >
                <span className="dot-live" />
                Live
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent>
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-44 gap-2 rounded-xl bg-muted/20 border border-dashed border-border/50">
                <Radio className="w-5 h-5 opacity-20" />
                <p className="text-sm text-muted-foreground">No recent requests</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-60 space-y-0.5">
                {requests.slice(0, 20).map((r, idx) => {
                  const sc = statusChipColor(r.status_code);
                  return (
                    <div
                      key={r.request_id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors hover:bg-primary/5"
                      style={{ animation: `row-enter 0.25s cubic-bezier(0.16,1,0.3,1) ${idx * 25}ms both` }}
                    >
                      <span
                        className="font-semibold text-xs px-1.5 py-0.5 rounded w-9 text-center shrink-0"
                        style={{ color: sc.color, background: sc.bg }}
                      >
                        {r.status_code}
                      </span>
                      <Badge variant="secondary" className="font-mono flex-1 truncate bg-violet-500/8 text-violet-300">
                        {r.model.split("/").pop()?.split("-").slice(-2).join("-") ?? r.model}
                      </Badge>
                      <span className="text-muted-foreground">{formatNumber(r.total_tokens)} tok</span>
                      <span className="text-muted-foreground">{formatLatency(r.total_latency_ms)}</span>
                      <span className="text-muted-foreground/60">{formatRelative(r.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
