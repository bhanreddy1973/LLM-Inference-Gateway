"use client";

import { useState } from "react";
import useSWR from "swr";
import { usageApi } from "@/lib/api";
import { formatNumber, formatCost, formatLatency, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const DAYS_OPTIONS = [7, 14, 30, 90];
const MODEL_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const TT = {
  contentStyle: {
    background: "rgba(9,9,29,0.97)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
  cursor: { stroke: "rgba(255,255,255,0.05)", strokeWidth: 1 },
};

function ChartCard({
  title, subtitle, accentColor = "#8b5cf6", delay = 0, children,
}: {
  title: string; subtitle?: string; accentColor?: string; delay?: number; children: React.ReactNode;
}) {
  return (
    <Card style={{ animation: `slide-up 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}>
      <CardHeader className="flex-row items-center gap-2.5 space-y-0 pb-0">
        <div
          className="w-0.5 h-5 rounded-full shrink-0"
          style={{ background: `linear-gradient(180deg, ${accentColor}, transparent)` }}
        />
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {subtitle && <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useSWR(
    `analytics-${days}`,
    () => usageApi.analytics(days),
    { refreshInterval: 60_000 },
  );

  const daily  = (data?.daily_breakdown ?? []).map((d) => ({ ...d, day: formatDate(d.day) }));
  const models = data?.by_model ?? [];

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex justify-end">
        <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/50">
          {DAYS_OPTIONS.map((d) => (
            <Button
              key={d}
              variant={days === d ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setDays(d)}
              className={days === d ? "bg-primary/20 text-violet-300 border border-primary/35" : "text-muted-foreground"}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Requests Over Time" subtitle="Daily request volume" accentColor="#8b5cf6" delay={0}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={daily} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-req" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} formatter={(v) => [Number(v).toLocaleString(), "Requests"]} />
                  <Area type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={2}
                    fill="url(#grad-req)" dot={false} activeDot={{ r: 4, fill: "#c4b5fd", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Token Usage" subtitle="Total tokens per day" accentColor="#06b6d4" delay={60}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={daily} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip {...TT} formatter={(v) => [formatNumber(Number(v)), "Tokens"]} />
                  <Bar dataKey="total_tokens" fill="#06b6d4" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Estimated Cost (USD)" subtitle="Daily spend estimate" accentColor="#10b981" delay={120}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={daily} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-cost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${Number(v).toFixed(4)}`} />
                  <Tooltip {...TT} formatter={(v) => [formatCost(Number(v)), "Cost"]} />
                  <Area type="monotone" dataKey="cost_usd" stroke="#10b981" strokeWidth={2}
                    fill="url(#grad-cost)" dot={false} activeDot={{ r: 4, fill: "#34d399", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Avg Latency" subtitle="End-to-end request latency" accentColor="#f59e0b" delay={180}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={daily} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a4a68", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v}ms`} />
                  <Tooltip {...TT} formatter={(v) => [formatLatency(Number(v)), "Latency"]} />
                  <Line type="monotone" dataKey="avg_latency_ms" stroke="#f59e0b" strokeWidth={2}
                    dot={false} activeDot={{ r: 4, fill: "#fbbf24", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Model comparison table */}
          <Card style={{ animation: "slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 240ms both" }}>
            <CardHeader>
              <CardTitle className="text-sm">Model Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {models.length === 0 ? (
                <p className="text-sm text-center py-8 text-muted-foreground">
                  No model data for this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {["Model", "Requests", "Input Tokens", "Output Tokens", "Cost"].map((h) => (
                        <TableHead key={h} className="text-[11px] uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((m, i) => (
                      <TableRow key={m.model} className="hover:bg-primary/4">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: MODEL_COLORS[i % MODEL_COLORS.length] }}
                            />
                            <Badge
                              variant="secondary"
                              className="font-mono text-xs"
                              style={{
                                background: `${MODEL_COLORS[i % MODEL_COLORS.length]}12`,
                                color: MODEL_COLORS[i % MODEL_COLORS.length],
                              }}
                            >
                              {m.model}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{m.requests.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">{formatNumber(m.input_tokens)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatNumber(m.output_tokens)}</TableCell>
                        <TableCell className="text-emerald-400 font-semibold">{formatCost(m.cost_usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
