"use client";

import useSWR from "swr";
import { usageApi, healthApi } from "@/lib/api";
import { formatNumber, formatCost, formatLatency } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { Sparkline } from "@/components/charts/sparkline";
import { HealthPanel } from "@/components/dashboard/health-panel";
import { RecentRequestsTable } from "@/components/dashboard/recent-requests";
import { Activity, Cpu, DollarSign, Zap, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";
import { useState, useEffect } from "react";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="h-5 w-0.5 rounded-full"
        style={{ background: "linear-gradient(180deg, #a78bfa, #22d3ee)" }}
      />
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [tick, setTick] = useState(0);

  const { data: analytics, isLoading: aLoading, mutate: reloadAnalytics } = useSWR(
    "analytics-30",
    () => usageApi.analytics(30),
    { refreshInterval: 30_000 },
  );
  const { data: health } = useSWR(
    "health",
    () => healthApi.status(),
    { refreshInterval: 30_000 },
  );

  // Live refresh timer
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const summary = analytics?.summary;
  const daily = analytics?.daily_breakdown ?? [];
  const models = analytics?.by_model ?? [];
  const recent = analytics?.recent_requests ?? [];

  const sparkReq     = daily.slice(-7).map((d) => ({ value: d.requests }));
  const sparkTok     = daily.slice(-7).map((d) => ({ value: d.total_tokens }));
  const sparkCost    = daily.slice(-7).map((d) => ({ value: d.cost_usd * 1000 }));
  const sparkLatency = daily.slice(-7).map((d) => ({ value: d.avg_latency_ms }));

  const modelPieData = models.map((m) => ({
    name: m.model.split("-").slice(-2).join("-"),
    value: m.requests,
  }));

  return (
    <div className="space-y-7">
      {/* ── Page header ── */}
      <div
        className="flex items-start justify-between"
        style={{ animation: "stagger-in 0.5s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <div>
          <h1 className="text-2xl font-bold gradient-text tracking-tight">Overview</h1>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: "var(--color-muted-foreground)" }}>
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
            Last 30 days · Refreshes every 30s
          </p>
        </div>

        <button
          onClick={() => reloadAnalytics()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-white/8"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--color-muted-foreground)",
          }}
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={aLoading ? "—" : formatNumber(summary?.total_requests ?? 0)}
          subtitle="30-day period"
          icon={<Activity className="w-5 h-5" style={{ color: "#a78bfa" }} />}
          accentColor="#8b5cf6"
          glowClass="glow-violet"
          delay={60}
        >
          {sparkReq.length > 0 && <Sparkline data={sparkReq} color="#8b5cf6" gradientId="spark-req" />}
        </StatCard>

        <StatCard
          title="Total Tokens"
          value={aLoading ? "—" : formatNumber((summary?.total_input_tokens ?? 0) + (summary?.total_output_tokens ?? 0))}
          subtitle={`${formatNumber(summary?.total_input_tokens ?? 0)} in · ${formatNumber(summary?.total_output_tokens ?? 0)} out`}
          icon={<Cpu className="w-5 h-5" style={{ color: "#22d3ee" }} />}
          accentColor="#06b6d4"
          glowClass="glow-cyan"
          delay={120}
        >
          {sparkTok.length > 0 && <Sparkline data={sparkTok} color="#06b6d4" gradientId="spark-tok" />}
        </StatCard>

        <StatCard
          title="Estimated Cost"
          value={aLoading ? "—" : formatCost(summary?.total_cost_usd ?? 0)}
          subtitle="Claude Sonnet pricing"
          icon={<DollarSign className="w-5 h-5" style={{ color: "#34d399" }} />}
          accentColor="#10b981"
          glowClass="glow-emerald"
          delay={180}
        >
          {sparkCost.length > 0 && <Sparkline data={sparkCost} color="#10b981" gradientId="spark-cost" />}
        </StatCard>

        <StatCard
          title="Avg Latency"
          value={aLoading ? "—" : formatLatency(daily.length ? daily.reduce((s, d) => s + d.avg_latency_ms, 0) / daily.length : 0)}
          subtitle="Per request"
          icon={<Zap className="w-5 h-5" style={{ color: "#fbbf24" }} />}
          accentColor="#f59e0b"
          glowClass="glow-amber"
          delay={240}
        >
          {sparkLatency.length > 0 && <Sparkline data={sparkLatency} color="#f59e0b" gradientId="spark-lat" />}
        </StatCard>
      </div>

      {/* ── Middle row: donut + health ── */}
      <div
        className="grid grid-cols-3 gap-4"
        style={{ animation: "stagger-in 0.55s cubic-bezier(0.16,1,0.3,1) 0.25s both" }}
      >
        {/* Model breakdown */}
        <div className="col-span-2 glass-card p-5">
          <SectionHeader title="Requests by Model" subtitle="Distribution across models" />

          {modelPieData.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-48 gap-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <svg className="w-5 h-5 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                No model usage data yet
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-8">
              {/* Donut */}
              <div className="h-48 w-48 flex-shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {modelPieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                          style={{ filter: `drop-shadow(0 0 6px ${COLORS[i % COLORS.length]}60)` }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(8,8,20,0.97)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        color: "#f0f0f8",
                        fontSize: 12,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                      }}
                      itemStyle={{ color: "#e0e0f0" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>
                    {models.reduce((s, m) => s + m.requests, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>total</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2.5">
                {modelPieData.map((m, i) => {
                  const total = modelPieData.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? Math.round((m.value / total) * 100) : 0;
                  return (
                    <div key={m.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              background: COLORS[i % COLORS.length],
                              boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}60`,
                            }}
                          />
                          <span style={{ color: "var(--color-card-foreground)" }}>{m.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                            {m.value.toLocaleString()}
                          </span>
                          <span className="text-[10px] w-8 text-right" style={{ color: "var(--color-muted-foreground)" }}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      {/* Mini progress bar */}
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${pct}%`,
                            background: COLORS[i % COLORS.length],
                            boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}60`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Health panel */}
        <HealthPanel health={health} />
      </div>

      {/* ── Recent requests ── */}
      <div style={{ animation: "stagger-in 0.55s cubic-bezier(0.16,1,0.3,1) 0.35s both" }}>
        <RecentRequestsTable requests={recent} />
      </div>
    </div>
  );
}
