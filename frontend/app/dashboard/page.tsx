"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Clock,
  DollarSign,
  Key,
  Loader2,
  TrendingUp,
  Zap,
  Sparkles,
  CircleDot,
} from "lucide-react";
import {
  EvilAreaChart,
  Area,
  XAxis,
  Grid,
  Tooltip,
  Legend,
} from "@/components/evilcharts/charts/area-chart";
import { getAnalytics, listApiKeys, type AnalyticsResponse, type ApiKey } from "@/lib/api";
import { useDemo } from "@/lib/demo-context";
import { DEMO_ANALYTICS, DEMO_KEYS } from "@/lib/demo-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
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

const STATUS_STYLE: Record<number, { dot: string; badge: string; label: string }> = {
  200: { dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20", label: "OK" },
  429: { dot: "bg-amber-400",   badge: "text-amber-400 bg-amber-500/10 ring-amber-500/20",     label: "Rate limited" },
  502: { dot: "bg-red-400",     badge: "text-red-400 bg-red-500/10 ring-red-500/20",           label: "Error" },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent = "zinc",
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent?: "zinc" | "emerald" | "blue" | "violet";
}) {
  const accents: Record<string, string> = {
    zinc:    "from-zinc-500/10 to-transparent border-zinc-500/10",
    emerald: "from-emerald-500/10 to-transparent border-emerald-500/10",
    blue:    "from-blue-500/10 to-transparent border-blue-500/10",
    violet:  "from-violet-500/10 to-transparent border-violet-500/10",
  };
  const iconColors: Record<string, string> = {
    zinc:    "text-zinc-400 bg-zinc-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    blue:    "text-blue-400 bg-blue-500/10",
    violet:  "text-violet-400 bg-violet-500/10",
  };
  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-b p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] ${accents[accent]}`}>
      {/* subtle grid texture */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
          <div className={`flex size-8 items-center justify-center rounded-xl ${iconColors[accent]}`}>
            <Icon className="size-4" />
          </div>
        </div>
        <p className="text-3xl font-semibold tracking-[-0.04em] text-zinc-50">{value}</p>
        {sub && (
          <p className="mt-1.5 flex items-center gap-1 text-[12px] text-zinc-500">
            <TrendingUp className="size-3 text-zinc-600" />
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [keys, setKeys]           = useState<ApiKey[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const isDemo = useDemo();

  // Set page title
  useEffect(() => { document.title = "Overview · Acheron"; }, []);

  useEffect(() => {
    if (isDemo) {
      setAnalytics(DEMO_ANALYTICS);
      setKeys(DEMO_KEYS);
      setLoading(false);
      return;
    }
    Promise.all([getAnalytics(30), listApiKeys()])
      .then(([a, k]) => { setAnalytics(a); setKeys(k); })
      .catch(() => setError("Failed to load dashboard data. Make sure the backend is running."))
      .finally(() => setLoading(false));
  }, [isDemo]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-zinc-600" />
          <p className="text-[13px] text-zinc-600">Loading dashboard…</p>
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
          <div>
            <p className="text-sm font-medium text-zinc-200">Something went wrong</p>
            <p className="mt-1 text-[13px] text-zinc-500">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-white/10 px-5 py-2 text-[13px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const s       = analytics?.summary;
  const daily   = analytics?.daily ?? [];
  const recent  = analytics?.recent_requests ?? [];
  const activeKeys = keys.filter((k) => k.is_active).length;
  const avgLatency =
    daily.length > 0
      ? Math.round(daily.reduce((a, d) => a + d.avg_latency_ms, 0) / daily.length)
      : 0;

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = daily.slice(-14).map((d) => ({
    day: new Date(d.day).toLocaleDateString("en", { month: "short", day: "numeric" }),
    requests: d.requests,
    tokens: Math.round(d.total_tokens / 100), // scaled for readability
  }));

  const chartConfig = {
    requests: {
      label: "Requests",
      colors: { light: ["#6366f1"], dark: ["#818cf8"] },
    },
    tokens: {
      label: "Tokens (×100)",
      colors: { light: ["#10b981"], dark: ["#34d399"] },
    },
  };

  // ── Empty state seed data (when no real data yet) ─────────────────────────
  const hasData = chartData.some((d) => d.requests > 0);
  const displayData = hasData
    ? chartData
    : Array.from({ length: 14 }, (_, i) => ({
        day: new Date(Date.now() - (13 - i) * 86_400_000).toLocaleDateString("en", { month: "short", day: "numeric" }),
        requests: 0,
        tokens: 0,
      }));

  return (
    <div className="min-h-screen px-8 py-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-zinc-50">Overview</h1>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-500">
              Last 30 days
            </span>
          </div>
          <p className="text-[13px] text-zinc-600">
            {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <Link
          href="/dashboard/playground"
          className="group flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-white to-zinc-100 px-4 text-[13px] font-semibold text-zinc-900 shadow-[0_1px_0_1px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-4px_rgba(255,255,255,0.2)] active:translate-y-0"
        >
          <Sparkles className="size-3.5 text-violet-600 transition group-hover:rotate-12" />
          Try Playground
        </Link>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Requests"
          value={fmt(s?.total_requests ?? 0)}
          sub={`${s?.period_days ?? 30}-day period`}
          icon={Activity}
          accent="blue"
        />
        <StatCard
          label="Tokens Used"
          value={fmt((s?.total_input_tokens ?? 0) + (s?.total_output_tokens ?? 0))}
          sub={`${fmt(s?.total_input_tokens ?? 0)} in · ${fmt(s?.total_output_tokens ?? 0)} out`}
          icon={Zap}
          accent="violet"
        />
        <StatCard
          label="Estimated Cost"
          value={`$${(s?.total_cost_usd ?? 0).toFixed(4)}`}
          sub="Claude pricing"
          icon={DollarSign}
          accent="emerald"
        />
        <StatCard
          label="Avg Latency"
          value={avgLatency > 0 ? `${avgLatency}ms` : "—"}
          sub="Across all requests"
          icon={Clock}
          accent="zinc"
        />
      </div>

      {/* ── Middle Row ──────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-4">

        {/* Area chart */}
        <div className="col-span-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <p className="text-[13px] font-semibold text-zinc-200">Request Volume</p>
              <p className="text-[12px] text-zinc-600">Last 14 days</p>
            </div>
            <Link
              href="/dashboard/usage"
              className="flex items-center gap-1 text-[12px] text-zinc-500 transition hover:text-zinc-300"
            >
              Full analytics <ArrowUpRight className="size-3" />
            </Link>
          </div>

          {hasData ? (
            <div className="h-[220px] p-2">
              <EvilAreaChart
                data={displayData}
                config={chartConfig}
                className="h-full w-full"
                xDataKey="day"
              >
                <Grid />
                <XAxis dataKey="day" tickFormatter={(v: string) => v} />
                <Tooltip />
                <Legend />
                <Area dataKey="requests" variant="gradient" />
                <Area dataKey="tokens" variant="gradient" />
              </EvilAreaChart>
            </div>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                <Activity className="size-6 text-zinc-700" />
              </div>
              <div className="text-center">
                <p className="text-[13px] text-zinc-500">No data yet</p>
                <p className="mt-0.5 text-[12px] text-zinc-700">
                  Make your first request via the{" "}
                  <Link href="/dashboard/playground" className="text-zinc-500 underline hover:text-zinc-300">
                    Playground
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* API Keys panel */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <p className="text-[13px] font-semibold text-zinc-200">API Keys</p>
            <Link
              href="/dashboard/keys"
              className="flex items-center gap-1 text-[12px] text-zinc-500 transition hover:text-zinc-300"
            >
              Manage <ArrowUpRight className="size-3" />
            </Link>
          </div>

          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="flex size-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <Key className="size-5 text-zinc-600" />
              </div>
              <p className="text-[12px] text-zinc-600">No API keys yet</p>
              <Link
                href="/dashboard/keys"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
              >
                Create your first key →
              </Link>
            </div>
          ) : (
            <div className="p-3">
              {/* summary */}
              <div className="mb-3 flex items-center gap-2 px-2">
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                  {activeKeys} active
                </span>
                <span className="text-[11px] text-zinc-600">{keys.length} total</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {keys.slice(0, 5).map((k) => (
                  <div key={k.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <CircleDot className={`size-3 ${k.is_active ? "text-emerald-400" : "text-zinc-700"}`} />
                      <span className="font-mono text-[12px] text-zinc-400">
                        {k.name ? k.name : `${k.key_prefix}…`}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-700">
                      {k.last_used_at ? timeAgo(k.last_used_at) : "unused"}
                    </span>
                  </div>
                ))}
                {keys.length > 5 && (
                  <Link
                    href="/dashboard/keys"
                    className="mt-1 text-center text-[11px] text-zinc-600 hover:text-zinc-400"
                  >
                    +{keys.length - 5} more keys
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Requests ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Recent Requests</p>
            <p className="text-[12px] text-zinc-600">Latest activity across all models</p>
          </div>
          <Link
            href="/dashboard/logs"
            className="flex items-center gap-1 text-[12px] text-zinc-500 transition hover:text-zinc-300"
          >
            View all <ArrowUpRight className="size-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Activity className="size-10 text-zinc-800" />
            <div className="text-center">
              <p className="text-[13px] text-zinc-500">No requests yet</p>
              <p className="mt-1 text-[12px] text-zinc-700">
                Start by trying the{" "}
                <Link href="/dashboard/playground" className="text-zinc-500 underline hover:text-zinc-300">
                  Playground
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_160px_110px_110px_90px_90px] gap-4 px-5 py-3">
              {["Request ID", "Model", "Tokens", "Latency", "Status", "Time"].map((h) => (
                <span key={h} className="text-[11px] font-medium uppercase tracking-widest text-zinc-700">{h}</span>
              ))}
            </div>

            {recent.slice(0, 10).map((r) => {
              const st = STATUS_STYLE[r.status_code] ?? STATUS_STYLE[502];
              return (
                <div
                  key={r.request_id}
                  className="grid grid-cols-[1fr_160px_110px_110px_90px_90px] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                >
                  <span className="truncate font-mono text-[12px] text-zinc-500">
                    {r.request_id.slice(0, 16)}…
                  </span>
                  <span className="truncate text-[12px] text-zinc-400">
                    {r.model.replace("claude-", "").replace(/-\d{8}$/, "")}
                  </span>
                  <span className="text-[12px] text-zinc-400">
                    {fmt(r.input_tokens + r.output_tokens)}
                  </span>
                  <span className="text-[12px] text-zinc-400">{r.total_latency_ms}ms</span>
                  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${st.badge}`}>
                    <span className={`size-1.5 rounded-full ${st.dot}`} />
                    {r.status_code}
                  </span>
                  <span className="text-[12px] text-zinc-600">{timeAgo(r.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
