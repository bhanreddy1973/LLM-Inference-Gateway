"use client";

import useSWR from "swr";
import { healthApi, usageApi } from "@/lib/api";
import { formatRelative, formatLatency, formatNumber, statusColor } from "@/lib/utils";
import { Database, Server, Radio, BarChart2, Zap, TrendingUp, AlertCircle, Activity } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import type { HealthStatus, RealtimeStats } from "@/types/api";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(6,6,18,0.97)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    color: "#f0f0f8",
    fontSize: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
};

function ServiceCard({
  label,
  icon: Icon,
  status,
  detail,
  accentColor = "#34d399",
  index = 0,
}: {
  label: string;
  icon: React.ElementType;
  status?: "healthy" | "degraded" | "unhealthy";
  detail?: string;
  accentColor?: string;
  index?: number;
}) {
  const color =
    status === "healthy" ? "#34d399" : status === "degraded" ? "#fbbf24" : "#f87171";
  const bg =
    status === "healthy"
      ? "rgba(52,211,153,0.06)"
      : status === "degraded"
      ? "rgba(251,191,36,0.06)"
      : "rgba(248,113,113,0.06)";
  const border =
    status === "healthy"
      ? "rgba(52,211,153,0.18)"
      : status === "degraded"
      ? "rgba(251,191,36,0.18)"
      : "rgba(248,113,113,0.18)";

  return (
    <div
      className="glass-card p-4 transition-all duration-300"
      style={{
        borderColor: status ? border : "rgba(255,255,255,0.08)",
        background: status ? bg : "rgba(255,255,255,0.04)",
        animation: `stagger-in 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 0.07}s both`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}25` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: status ? color : "var(--color-muted-foreground)" }} />
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
            {label}
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 6px ${color}`,
              animation: status === "healthy" ? "live-dot 1.8s ease-in-out infinite" : "none",
            }}
          />
          {status ?? "unknown"}
        </span>
      </div>
      {detail && (
        <p className="text-xs ml-9.5" style={{ color: "var(--color-muted-foreground)" }}>
          {detail}
        </p>
      )}
    </div>
  );
}

export default function MonitoringPage() {
  const { data: health } = useSWR<HealthStatus>("health-status", () => healthApi.status(), {
    refreshInterval: 5_000,
  });
  const { data: realtime } = useSWR<RealtimeStats>("realtime", () => usageApi.realtime(), {
    refreshInterval: 5_000,
  });

  const requests = realtime?.requests ?? [];

  // Rolling activity chart
  const buckets: { t: string; count: number }[] = [];
  const chunk = Math.max(1, Math.ceil(requests.length / 10));
  for (let i = 0; i < Math.min(requests.length, 30); i += chunk) {
    buckets.push({
      t: formatRelative(requests[i]?.created_at ?? new Date().toISOString()),
      count: chunk,
    });
  }

  const workerSvc = health?.worker;
  const cbState = (workerSvc as { circuit_breaker?: string })?.circuit_breaker ?? "unknown";
  const cbColor =
    cbState === "closed" ? "#34d399" : cbState === "half_open" ? "#fbbf24" : "#f87171";

  const kpis = [
    { label: "Req / 1 min",       value: realtime?.throughput_1m ?? 0,                icon: TrendingUp,  color: "#a78bfa" },
    { label: "Req / 5 min",       value: realtime?.throughput_5m ?? 0,                icon: Zap,         color: "#22d3ee" },
    { label: "Error rate (1h)",   value: `${((realtime?.error_rate_1h ?? 0) * 100).toFixed(1)}%`, icon: AlertCircle, color: "#fbbf24" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div style={{ animation: "stagger-in 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold gradient-text tracking-tight">Monitoring</h1>
          <span
            className="live-badge"
            style={{ animation: "stagger-in 0.5s 0.1s both" }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 6px #34d399",
                animation: "live-dot 1.8s ease-in-out infinite",
              }}
            />
            Live
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
          Real-time system status · Auto-refreshes every 5s
        </p>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }, idx) => (
          <div
            key={label}
            className="glass-card-hover p-5 flex items-center gap-4"
            style={{ animation: `stagger-in 0.5s cubic-bezier(0.16,1,0.3,1) ${80 + idx * 60}ms both` }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `${color}14`,
                border: `1px solid ${color}28`,
                boxShadow: `0 0 16px ${color}20`,
              }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-foreground)" }}>
                {value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Service health ── */}
      <div style={{ animation: "stagger-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.22s both" }}>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-foreground)" }}>
          Service Health
        </p>
        <div className="grid grid-cols-4 gap-3">
          <ServiceCard
            label="PostgreSQL"
            icon={Database}
            status={health?.postgres?.status as "healthy" | "degraded" | "unhealthy"}
            accentColor="#a78bfa"
            index={0}
          />
          <ServiceCard
            label="Redis"
            icon={Server}
            status={health?.redis?.status as "healthy" | "degraded" | "unhealthy"}
            detail={(health?.redis as { used_memory_mb?: number })?.used_memory_mb
              ? `${(health?.redis as { used_memory_mb?: number }).used_memory_mb?.toFixed(1)} MB`
              : undefined}
            accentColor="#22d3ee"
            index={1}
          />
          <ServiceCard
            label="gRPC Worker"
            icon={Radio}
            status={health?.worker?.status as "healthy" | "degraded" | "unhealthy"}
            detail={`Circuit: ${cbState}`}
            accentColor="#34d399"
            index={2}
          />
          <ServiceCard
            label="ClickHouse"
            icon={BarChart2}
            status={health?.clickhouse?.status as "healthy" | "degraded" | "unhealthy"}
            accentColor="#fbbf24"
            index={3}
          />
        </div>
      </div>

      {/* ── Circuit breaker ── */}
      <div
        className="glass-card p-5"
        style={{ animation: "stagger-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.28s both" }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
          Circuit Breaker
        </p>
        <div className="flex items-center gap-3">
          {["closed", "half_open", "open"].map((state) => {
            const active = cbState === state;
            const c =
              state === "closed" ? "#34d399" : state === "half_open" ? "#fbbf24" : "#f87171";
            return (
              <div
                key={state}
                className="flex items-center gap-3 px-5 py-3 rounded-xl flex-1 justify-center transition-all duration-500"
                style={{
                  background: active ? `${c}10` : "rgba(255,255,255,0.025)",
                  border: `1px solid ${active ? `${c}35` : "rgba(255,255,255,0.06)"}`,
                  boxShadow: active ? `0 0 24px ${c}18` : "none",
                }}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background: active ? c : "#1f2937",
                    boxShadow: active ? `0 0 12px ${c}` : "none",
                    transition: "all 0.4s ease",
                  }}
                />
                <span
                  className="text-sm font-semibold capitalize"
                  style={{ color: active ? c : "var(--color-muted-foreground)" }}
                >
                  {state.replace("_", " ")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Activity + live feed ── */}
      <div
        className="grid grid-cols-5 gap-4"
        style={{ animation: "stagger-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.34s both" }}
      >
        {/* Activity chart */}
        <div className="col-span-2 glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
              Request Activity
            </p>
          </div>
          {buckets.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={buckets} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-live" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#grad-live)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-44 gap-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)" }}
            >
              <Activity className="w-5 h-5 opacity-20" />
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                Waiting for requests…
              </p>
            </div>
          )}
        </div>

        {/* Live feed */}
        <div className="col-span-3 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
              Live Request Feed
            </p>
            <span className="live-badge">
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#34d399",
                  boxShadow: "0 0 6px #34d399",
                  animation: "live-dot 1.8s ease-in-out infinite",
                }}
              />
              Live
            </span>
          </div>

          {requests.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-40 gap-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)" }}
            >
              <Radio className="w-5 h-5 opacity-20" />
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                No recent requests
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[240px] space-y-0.5">
              {requests.slice(0, 20).map((r, idx) => (
                <div
                  key={r.request_id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors duration-150 animate-row-in"
                  style={{ animationDelay: `${idx * 0.03}s` }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(139,92,246,0.06)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* Status badge */}
                  <span
                    className={`font-bold text-xs w-9 flex-shrink-0 px-1.5 py-0.5 rounded text-center ${statusColor(r.status_code)}`}
                    style={{
                      background:
                        r.status_code < 300
                          ? "rgba(52,211,153,0.1)"
                          : r.status_code < 500
                          ? "rgba(251,191,36,0.1)"
                          : "rgba(248,113,113,0.1)",
                    }}
                  >
                    {r.status_code}
                  </span>

                  {/* Model */}
                  <span
                    className="font-mono flex-1 truncate text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(139,92,246,0.08)", color: "#a78bfa" }}
                  >
                    {r.model.split("-").slice(-2).join("-")}
                  </span>

                  {/* Stats */}
                  <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                    {formatNumber(r.total_tokens)} tok
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                    {formatLatency(r.total_latency_ms)}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)", opacity: 0.55 }}
                  >
                    {formatRelative(r.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
