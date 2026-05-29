"use client";

import useSWR from "swr";
import { usageApi, healthApi } from "@/lib/api";
import { formatNumber, formatCost, formatLatency } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { Sparkline } from "@/components/charts/sparkline";
import { HealthPanel } from "@/components/dashboard/health-panel";
import { RecentRequestsTable } from "@/components/dashboard/recent-requests";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { AnimatedGroup } from "@/components/motion/animated-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Cpu, DollarSign, Zap, RefreshCw, TrendingUp } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e"];

export default function DashboardPage() {
  const { data: analytics, isLoading, mutate } = useSWR(
    "analytics-30",
    () => usageApi.analytics(30),
    { refreshInterval: 30_000 },
  );
  const { data: health } = useSWR("health", () => healthApi.status(), { refreshInterval: 30_000 });

  const summary = analytics?.summary;
  const daily   = analytics?.daily_breakdown ?? [];
  const models  = analytics?.by_model ?? [];
  const recent  = analytics?.recent_requests ?? [];

  const totalTokens  = (summary?.total_input_tokens ?? 0) + (summary?.total_output_tokens ?? 0);
  const avgLatency   = daily.length ? daily.reduce((s, d) => s + d.avg_latency_ms, 0) / daily.length : 0;

  const sparkReq  = daily.slice(-7).map((d) => ({ value: d.requests }));
  const sparkTok  = daily.slice(-7).map((d) => ({ value: d.total_tokens }));
  const sparkCost = daily.slice(-7).map((d) => ({ value: d.cost_usd * 1000 }));
  const sparkLat  = daily.slice(-7).map((d) => ({ value: d.avg_latency_ms }));

  const pieData = models.map((m) => ({
    name: m.model.split("/").pop()?.split("-").slice(-2).join("-") ?? m.model,
    value: m.requests,
  }));
  const pieTotal = pieData.reduce((s, x) => s + x.value, 0);

  return (
    <div className="space-y-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="dot-live" />
          <div>
            <span className="text-xs font-medium text-foreground/80">Live Dashboard</span>
            <span className="text-xs text-muted-foreground/50 ml-2">
              Last 30 days · Auto-refreshes
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="gap-2 rounded-lg border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-violet-500/20 transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {/* KPI grid — using AnimatedGroup from motion-primitives */}
      <AnimatedGroup
        preset="slide"
        className="grid grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard
          title="Total Requests"
          value={isLoading ? "—" : formatNumber(summary?.total_requests ?? 0)}
          subtitle="30-day period"
          icon={<Activity className="w-4 h-4" style={{ color: "#a78bfa" }} strokeWidth={2} />}
          accentColor="#8b5cf6"
          delay={0}
        >
          {sparkReq.length > 1 && <Sparkline data={sparkReq} color="#8b5cf6" gradientId="spark-req" />}
        </StatCard>

        <StatCard
          title="Total Tokens"
          value={isLoading ? "—" : formatNumber(totalTokens)}
          subtitle={`${formatNumber(summary?.total_input_tokens ?? 0)} in · ${formatNumber(summary?.total_output_tokens ?? 0)} out`}
          icon={<Cpu className="w-4 h-4" style={{ color: "#22d3ee" }} strokeWidth={2} />}
          accentColor="#06b6d4"
          delay={80}
        >
          {sparkTok.length > 1 && <Sparkline data={sparkTok} color="#06b6d4" gradientId="spark-tok" />}
        </StatCard>

        <StatCard
          title="Estimated Cost"
          value={isLoading ? "—" : formatCost(summary?.total_cost_usd ?? 0)}
          subtitle="Estimated total spend"
          icon={<DollarSign className="w-4 h-4" style={{ color: "#34d399" }} strokeWidth={2} />}
          accentColor="#10b981"
          delay={160}
        >
          {sparkCost.length > 1 && <Sparkline data={sparkCost} color="#10b981" gradientId="spark-cost" />}
        </StatCard>

        <StatCard
          title="Avg Latency"
          value={isLoading ? "—" : formatLatency(avgLatency)}
          subtitle="Per request average"
          icon={<Zap className="w-4 h-4" style={{ color: "#fbbf24" }} strokeWidth={2} />}
          accentColor="#f59e0b"
          delay={240}
        >
          {sparkLat.length > 1 && <Sparkline data={sparkLat} color="#f59e0b" gradientId="spark-lat" />}
        </StatCard>
      </AnimatedGroup>

      {/* Quick ticker stats — MagicUI NumberTicker */}
      {!isLoading && summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.6)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Unique Models</p>
              <NumberTicker value={models.length} className="text-lg font-bold" delay={0.3} />
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Avg Tokens/Req</p>
              <NumberTicker
                value={summary.total_requests > 0 ? Math.round(totalTokens / summary.total_requests) : 0}
                className="text-lg font-bold"
                delay={0.4}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Cost/1K Tokens</p>
              <NumberTicker
                value={totalTokens > 0 ? Number(((summary.total_cost_usd / totalTokens) * 1000).toFixed(2)) : 0}
                className="text-lg font-bold"
                decimalPlaces={2}
                delay={0.5}
              />
            </div>
          </div>
        </div>
      )}

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Model distribution */}
        <Card className="lg:col-span-2 relative overflow-hidden">
          {/* Decorative gradient */}
          <div
            className="absolute top-0 left-8 right-8 h-[1px]"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.2), rgba(6,182,212,0.15), transparent)",
            }}
          />

          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))",
                  border: "1px solid rgba(139,92,246,0.15)",
                }}
              >
                <TrendingUp className="w-3.5 h-3.5 text-violet-300" strokeWidth={2} />
              </div>
              <CardTitle className="text-sm font-semibold">Requests by Model</CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4 rounded-xl bg-white/[0.015] border border-dashed border-white/[0.06]">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.06))",
                    border: "1px solid rgba(139,92,246,0.12)",
                  }}
                >
                  <svg className="w-5 h-5 text-violet-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground/60">No model usage data yet</p>
              </div>
            ) : (
              <div className="flex items-center gap-10">
                {/* Donut */}
                <div className="w-48 h-48 shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={52} outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={COLORS[i % COLORS.length]}
                            style={{ filter: `drop-shadow(0 0 8px ${COLORS[i % COLORS.length]}40)` }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(5,5,16,0.97)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          fontSize: 12,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                          backdropFilter: "blur(12px)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <NumberTicker value={pieTotal} className="text-xl font-bold" delay={0.2} />
                    <p className="text-[10px] text-muted-foreground/60 font-medium">total</p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {pieData.map((m, i) => {
                    const pct = pieTotal > 0 ? Math.round((m.value / pieTotal) * 100) : 0;
                    return (
                      <div key={m.name} className="space-y-1.5 group">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                              style={{
                                background: COLORS[i % COLORS.length],
                                boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}60`,
                              }}
                            />
                            <span className="text-muted-foreground group-hover:text-foreground transition-colors">{m.name}</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-foreground tabular-nums">
                              {m.value.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground/40 text-[10px] min-w-7 text-right font-medium">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden bg-white/[0.04]">
                          <div
                            className="h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}80)`,
                              boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}30`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health */}
        <HealthPanel health={health} />
      </div>

      {/* Recent requests */}
      <RecentRequestsTable requests={recent} />
    </div>
  );
}
