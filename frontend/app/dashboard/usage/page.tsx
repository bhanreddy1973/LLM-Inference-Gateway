"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock,
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  EvilAreaChart,
  Area,
  XAxis  as AreaXAxis,
  Grid   as AreaGrid,
  Tooltip as AreaTooltip,
  Legend  as AreaLegend,
} from "@/components/evilcharts/charts/area-chart";
import {
  EvilBarChart,
  Bar,
  XAxis  as BarXAxis,
  YAxis  as BarYAxis,
  Grid   as BarGrid,
  Tooltip as BarTooltip,
} from "@/components/evilcharts/charts/bar-chart";
import {
  EvilLineChart,
  Line,
  XAxis  as LineXAxis,
  Grid   as LineGrid,
  Tooltip as LineTooltip,
} from "@/components/evilcharts/charts/line-chart";
import { getAnalytics, type AnalyticsResponse, type DailyUsage, type ModelUsage } from "@/lib/api";
import { useDemo } from "@/lib/demo-context";
import { DEMO_ANALYTICS } from "@/lib/demo-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function shortDay(iso: string) {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function shortModel(model: string) {
  return model.replace("claude-", "").replace(/-\d{8}$/, "");
}

const PERIOD_OPTIONS = [
  { label: "7d",  value: 7  },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const STATUS_STYLE: Record<number, string> = {
  200: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
  429: "text-amber-400  bg-amber-500/10  ring-amber-500/20",
  502: "text-red-400    bg-red-500/10    ring-red-500/20",
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent = "zinc", trend,
}: {
  label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral";
  icon: React.ElementType; accent?: "zinc" | "emerald" | "blue" | "violet" | "amber";
}) {
  const styles: Record<string, { wrap: string; icon: string }> = {
    zinc:    { wrap: "border-white/[0.06]  bg-white/[0.02]",   icon: "bg-zinc-500/10   text-zinc-400"   },
    emerald: { wrap: "border-emerald-500/10 bg-emerald-500/[0.04]", icon: "bg-emerald-500/10 text-emerald-400" },
    blue:    { wrap: "border-blue-500/10    bg-blue-500/[0.04]",    icon: "bg-blue-500/10   text-blue-400"    },
    violet:  { wrap: "border-violet-500/10  bg-violet-500/[0.04]",  icon: "bg-violet-500/10 text-violet-400"  },
    amber:   { wrap: "border-amber-500/10   bg-amber-500/[0.04]",   icon: "bg-amber-500/10  text-amber-400"   },
  };
  const s = styles[accent];
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5 ${s.wrap}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:20px_20px]" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">{label}</span>
          <div className={`flex size-8 items-center justify-center rounded-xl ${s.icon}`}>
            <Icon className="size-4" />
          </div>
        </div>
        <p className="text-[28px] font-semibold tracking-[-0.04em] text-zinc-50">{value}</p>
        {sub && (
          <p className={`mt-1.5 flex items-center gap-1 text-[12px] ${
            trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-zinc-600"
          }`}>
            {TrendIcon && <TrendIcon className="size-3" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <p className="text-[13px] font-semibold text-zinc-200">{title}</p>
        {sub && <p className="mt-0.5 text-[12px] text-zinc-600">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Empty chart placeholder ──────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-2">
      <BarChart3 className="size-8 text-zinc-800" />
      <p className="text-[13px] text-zinc-600">{message}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [period, setPeriod]       = useState(30);
  const [data, setData]           = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const isDemo = useDemo();

  // Set page title
  useEffect(() => { document.title = "Analytics · Acheron"; }, []);

  useEffect(() => {
    if (isDemo) {
      setData(DEMO_ANALYTICS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    getAnalytics(period)
      .then(setData)
      .catch(() => setError("Failed to load analytics. Make sure the backend is running."))
      .finally(() => setLoading(false));
  }, [period, isDemo]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-zinc-600" />
          <p className="text-[13px] text-zinc-600">Loading analytics…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-8">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <AlertCircle className="size-7 text-red-400" />
          </div>
          <p className="text-sm font-medium text-zinc-200">Something went wrong</p>
          <p className="text-[13px] text-zinc-500">{error}</p>
          <button
            onClick={() => { setError(""); setLoading(true); getAnalytics(period).then(setData).catch(() => setError(error)).finally(() => setLoading(false)); }}
            className="rounded-xl border border-white/10 px-5 py-2 text-[13px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const s      = data?.summary;
  const daily  = data?.daily   ?? [];
  const models = data?.by_model ?? [];
  const recent = data?.recent_requests ?? [];

  // ── Derived chart data ────────────────────────────────────────────────────

  // Area chart: requests + tokens per day
  const areaData = daily.map((d: DailyUsage) => ({
    day:      shortDay(d.day),
    requests: d.requests,
    tokens:   Math.round(d.total_tokens / 100), // scale for readability
  }));

  // Line chart: latency per day
  const latencyData = daily.map((d: DailyUsage) => ({
    day:     shortDay(d.day),
    latency: d.avg_latency_ms,
  }));

  // Bar chart: cost per day
  const costData = daily.map((d: DailyUsage) => ({
    day:  shortDay(d.day),
    cost: parseFloat(d.cost_usd.toFixed(4)),
  }));

  // Model bar chart
  const modelData = models.map((m: ModelUsage) => ({
    model:    shortModel(m.model),
    requests: m.requests,
    cost:     parseFloat(m.cost_usd.toFixed(4)),
  }));

  const hasData = daily.some((d: DailyUsage) => d.requests > 0);

  const avgLatency = daily.length > 0
    ? Math.round(daily.reduce((a: number, d: DailyUsage) => a + d.avg_latency_ms, 0) / daily.length)
    : 0;

  return (
    <div className="min-h-screen px-8 py-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-zinc-50">Analytics</h1>
          <p className="mt-0.5 text-[13px] text-zinc-600">
            Detailed usage breakdown across requests, tokens, cost and latency.
          </p>
        </div>

        {/* Period switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                period === opt.value
                  ? "bg-white/[0.08] text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Requests"
          value={fmt(s?.total_requests ?? 0)}
          sub={`${s?.period_days ?? period}-day window`}
          icon={Activity}
          accent="blue"
          trend="neutral"
        />
        <StatCard
          label="Total Tokens"
          value={fmt((s?.total_input_tokens ?? 0) + (s?.total_output_tokens ?? 0))}
          sub={`${fmt(s?.total_input_tokens ?? 0)} in · ${fmt(s?.total_output_tokens ?? 0)} out`}
          icon={Zap}
          accent="violet"
          trend="neutral"
        />
        <StatCard
          label="Total Cost"
          value={`$${(s?.total_cost_usd ?? 0).toFixed(4)}`}
          sub="Estimated (Claude pricing)"
          icon={DollarSign}
          accent="emerald"
          trend="neutral"
        />
        <StatCard
          label="Avg Latency"
          value={avgLatency > 0 ? `${avgLatency}ms` : "—"}
          sub="Mean across all requests"
          icon={Clock}
          accent="amber"
          trend="neutral"
        />
      </div>

      {/* ── Row 1: Request volume (area) + Latency (line) ───────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4">

        {/* Area – requests & tokens */}
        <Section title="Request Volume" sub={`Daily requests + tokens (×100) — last ${period} days`}>
          {hasData ? (
            <div className="h-[220px] p-3">
              <EvilAreaChart
                data={areaData}
                config={{
                  requests: { label: "Requests", colors: { light: ["#6366f1"], dark: ["#818cf8"] } },
                  tokens:   { label: "Tokens ×100", colors: { light: ["#10b981"], dark: ["#34d399"] } },
                }}
                className="h-full w-full"
                xDataKey="day"
              >
                <AreaGrid />
                <AreaXAxis dataKey="day" tickFormatter={(v: string) => v} />
                <AreaTooltip />
                <AreaLegend />
                <Area dataKey="requests" variant="gradient" />
                <Area dataKey="tokens"   variant="gradient" />
              </EvilAreaChart>
            </div>
          ) : (
            <EmptyChart message="No requests in this period" />
          )}
        </Section>

        {/* Line – latency trend */}
        <Section title="Latency Trend" sub={`Average response latency (ms) — last ${period} days`}>
          {hasData ? (
            <div className="h-[220px] p-3">
              <EvilLineChart
                data={latencyData}
                config={{
                  latency: { label: "Avg latency (ms)", colors: { light: ["#f59e0b"], dark: ["#fbbf24"] } },
                }}
                className="h-full w-full"
                xDataKey="day"
                curveType="monotone"
              >
                <LineGrid />
                <LineXAxis dataKey="day" tickFormatter={(v: string) => v} />
                <LineTooltip />
                <Line dataKey="latency" />
              </EvilLineChart>
            </div>
          ) : (
            <EmptyChart message="No latency data yet" />
          )}
        </Section>
      </div>

      {/* ── Row 2: Cost (bar) + Model breakdown (bar) ───────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4">

        {/* Bar – daily cost */}
        <Section title="Daily Cost" sub={`Estimated USD spend per day — last ${period} days`}>
          {hasData ? (
            <div className="h-[220px] p-3">
              <EvilBarChart
                data={costData}
                config={{
                  cost: { label: "Cost (USD)", colors: { light: ["#10b981"], dark: ["#34d399"] } },
                }}
                className="h-full w-full"
                xDataKey="day"
                animationType="left-to-right"
              >
                <BarGrid />
                <BarXAxis dataKey="day" tickFormatter={(v: string) => v} />
                <BarYAxis tickFormatter={(v: number) => `$${v}`} />
                <BarTooltip />
                <Bar dataKey="cost" variant="gradient" />
              </EvilBarChart>
            </div>
          ) : (
            <EmptyChart message="No cost data yet" />
          )}
        </Section>

        {/* Bar – per-model requests */}
        <Section title="Requests by Model" sub="Total requests broken down by model">
          {modelData.length > 0 ? (
            <div className="h-[220px] p-3">
              <EvilBarChart
                data={modelData}
                config={{
                  requests: { label: "Requests", colors: { light: ["#6366f1"], dark: ["#818cf8"] } },
                }}
                className="h-full w-full"
                xDataKey="model"
                animationType="left-to-right"
              >
                <BarGrid />
                <BarXAxis dataKey="model" tickFormatter={(v: string) => v} />
                <BarYAxis />
                <BarTooltip />
                <Bar dataKey="requests" variant="gradient" />
              </EvilBarChart>
            </div>
          ) : (
            <EmptyChart message="No model data yet" />
          )}
        </Section>
      </div>

      {/* ── Model breakdown table ────────────────────────────────────────── */}
      {models.length > 0 && (
        <div className="mb-6">
          <Section title="Model Breakdown" sub="Aggregated stats per model for the selected period">
            <div className="divide-y divide-white/[0.04]">
              {/* Header */}
              <div className="grid grid-cols-[1fr_100px_120px_120px_110px] gap-4 px-5 py-3">
                {["Model", "Requests", "Input tokens", "Output tokens", "Cost (USD)"].map((h) => (
                  <span key={h} className="text-[11px] font-medium uppercase tracking-widest text-zinc-700">{h}</span>
                ))}
              </div>
              {models.map((m: ModelUsage, i: number) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_100px_120px_120px_110px] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10">
                      <Zap className="size-3.5 text-violet-400" />
                    </div>
                    <span className="text-[13px] font-medium text-zinc-300">{shortModel(m.model)}</span>
                  </div>
                  <span className="text-[12px] text-zinc-400">{fmt(m.requests)}</span>
                  <span className="text-[12px] text-zinc-400">{fmt(m.input_tokens)}</span>
                  <span className="text-[12px] text-zinc-400">{fmt(m.output_tokens)}</span>
                  <span className="text-[12px] text-zinc-400">${m.cost_usd.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Recent Requests ──────────────────────────────────────────────── */}
      <Section title="Recent Requests" sub="Last 20 requests across all models">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Activity className="size-10 text-zinc-800" />
            <p className="text-[13px] text-zinc-600">No requests yet in this period</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_150px_110px_110px_80px_90px_80px] gap-4 px-5 py-3">
              {["Request ID", "Model", "Input", "Output", "Latency", "Status", "Time"].map((h) => (
                <span key={h} className="text-[11px] font-medium uppercase tracking-widest text-zinc-700">{h}</span>
              ))}
            </div>
            {recent.map((r) => {
              const st = STATUS_STYLE[r.status_code] ?? "text-zinc-400 bg-zinc-500/10 ring-zinc-500/20";
              return (
                <div
                  key={r.request_id}
                  className="grid grid-cols-[1fr_150px_110px_110px_80px_90px_80px] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                >
                  <span className="truncate font-mono text-[11px] text-zinc-600">
                    {r.request_id.slice(0, 18)}…
                  </span>
                  <span className="truncate text-[12px] text-zinc-400">{shortModel(r.model)}</span>
                  <span className="text-[12px] text-zinc-400">{fmt(r.input_tokens)}</span>
                  <span className="text-[12px] text-zinc-400">{fmt(r.output_tokens)}</span>
                  <span className="text-[12px] text-zinc-400">{r.total_latency_ms}ms</span>
                  <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${st}`}>
                    <span className={`size-1.5 rounded-full ${
                      r.status_code === 200 ? "bg-emerald-400" :
                      r.status_code === 429 ? "bg-amber-400"   : "bg-red-400"
                    }`}/>
                    {r.status_code}
                  </span>
                  <span className="text-[12px] text-zinc-600">{timeAgo(r.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
