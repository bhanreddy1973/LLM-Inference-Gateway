"use client";

import { useState } from "react";
import useSWR from "swr";
import { usageApi } from "@/lib/api";
import { formatNumber, formatCost, formatLatency, formatDate } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const DAYS_OPTIONS = [7, 14, 30, 90];
const MODEL_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(6,6,18,0.97)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    color: "#f0f0f8",
    fontSize: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
  itemStyle: { color: "#e0e0f0" },
  cursor: { stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 },
};

function ChartCard({
  title,
  subtitle,
  accentColor = "#8b5cf6",
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  accentColor?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="glass-card p-5"
      style={{
        animation: `stagger-in 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className="w-1 h-5 rounded-full flex-shrink-0"
          style={{ background: `linear-gradient(180deg, ${accentColor}, transparent)` }}
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
            {title}
          </p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useSWR(
    `analytics-${days}`,
    () => usageApi.analytics(days),
    { refreshInterval: 60_000 },
  );

  const daily = (data?.daily_breakdown ?? []).map((d) => ({
    ...d,
    day: formatDate(d.day),
  }));
  const models = data?.by_model ?? [];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between"
        style={{ animation: "stagger-in 0.5s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <div>
          <h1 className="text-2xl font-bold gradient-text tracking-tight">Analytics</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            Deep-dive into usage, costs, and performance
          </p>
        </div>

        {/* Date range selector */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={
                days === d
                  ? {
                      background: "rgba(139,92,246,0.2)",
                      color: "#c4b5fd",
                      border: "1px solid rgba(139,92,246,0.35)",
                      boxShadow: "0 0 12px rgba(139,92,246,0.15)",
                    }
                  : {
                      color: "var(--color-muted-foreground)",
                      border: "1px solid transparent",
                    }
              }
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card h-64 skeleton" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Row 1: Requests + Tokens ── */}
          <div className="grid grid-cols-2 gap-4">
            <ChartCard title="Requests Over Time" subtitle="Daily request volume" accentColor="#8b5cf6" delay={80}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-req" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [Number(v).toLocaleString(), "Requests"]} />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#grad-req)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#c4b5fd", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Token Usage" subtitle="Input + output tokens combined" accentColor="#06b6d4" delay={130}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [formatNumber(Number(v)), "Tokens"]} />
                  <Bar
                    dataKey="total_tokens"
                    name="Total Tokens"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                    opacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Row 2: Cost + Latency ── */}
          <div className="grid grid-cols-2 gap-4">
            <ChartCard title="Estimated Cost (USD)" subtitle="Daily spend estimate" accentColor="#10b981" delay={180}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-cost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v.toFixed(4)}`}
                  />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [formatCost(Number(v)), "Cost"]} />
                  <Area
                    type="monotone"
                    dataKey="cost_usd"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#grad-cost)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#34d399", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Avg Latency (ms)" subtitle="End-to-end request latency" accentColor="#f59e0b" delay={230}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}ms`}
                  />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [formatLatency(Number(v)), "Latency"]} />
                  <Line
                    type="monotone"
                    dataKey="avg_latency_ms"
                    name="Avg"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#fbbf24", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Model comparison ── */}
          <div
            className="glass-card p-5"
            style={{ animation: "stagger-in 0.55s cubic-bezier(0.16,1,0.3,1) 0.28s both" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 rounded-full flex-shrink-0"
                style={{ background: "linear-gradient(180deg, #a78bfa, #22d3ee)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                Model Comparison
              </p>
            </div>

            {models.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--color-muted-foreground)" }}>
                No model data available for this period
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["Model", "Requests", "Input Tokens", "Output Tokens", "Cost"].map((h) => (
                        <th
                          key={h}
                          className="text-left pb-3 pr-6 font-medium text-xs uppercase tracking-wider"
                          style={{ color: "rgba(255,255,255,0.25)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m, i) => (
                      <tr
                        key={m.model}
                        className="animate-row-in"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          animationDelay: `${i * 0.05}s`,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "rgba(139,92,246,0.04)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td className="py-3.5 pr-6">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                background: MODEL_COLORS[i % MODEL_COLORS.length],
                                boxShadow: `0 0 6px ${MODEL_COLORS[i % MODEL_COLORS.length]}60`,
                              }}
                            />
                            <span
                              className="font-mono text-xs px-2 py-0.5 rounded-md"
                              style={{
                                background: `${MODEL_COLORS[i % MODEL_COLORS.length]}12`,
                                color: MODEL_COLORS[i % MODEL_COLORS.length],
                              }}
                            >
                              {m.model}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-6 text-xs" style={{ color: "var(--color-card-foreground)" }}>
                          {m.requests.toLocaleString()}
                        </td>
                        <td className="py-3.5 pr-6 text-xs" style={{ color: "var(--color-card-foreground)" }}>
                          {formatNumber(m.input_tokens)}
                        </td>
                        <td className="py-3.5 pr-6 text-xs" style={{ color: "var(--color-card-foreground)" }}>
                          {formatNumber(m.output_tokens)}
                        </td>
                        <td className="py-3.5 text-xs font-semibold" style={{ color: "#34d399" }}>
                          {formatCost(m.cost_usd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
