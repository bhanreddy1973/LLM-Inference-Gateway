"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Loader2,
  RefreshCw,
  Server,
  XCircle,
  Zap,
} from "lucide-react";
import { getReadiness, type ReadinessResponse, type ServiceCheck } from "@/lib/api";
import { useDemo } from "@/lib/demo-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeNow() {
  return new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({
  name,
  icon: Icon,
  check,
  description,
}: {
  name: string;
  icon: React.ElementType;
  check: ServiceCheck | undefined;
  description: string;
}) {
  const healthy = check?.status === "healthy";
  const unknown = !check;

  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border p-5 transition-all " +
        (unknown
          ? "border-white/[0.06] bg-white/[0.02]"
          : healthy
          ? "border-emerald-500/10 bg-emerald-500/[0.04]"
          : "border-red-500/20 bg-red-500/[0.06]")
      }
    >
      {/* Background glow */}
      {!unknown && (
        <div
          className={
            "pointer-events-none absolute -right-8 -top-8 size-32 rounded-full blur-2xl " +
            (healthy ? "bg-emerald-500/10" : "bg-red-500/10")
          }
        />
      )}

      <div className="relative">
        <div className="mb-4 flex items-start justify-between">
          <div
            className={
              "flex size-10 items-center justify-center rounded-xl " +
              (unknown
                ? "bg-zinc-800 text-zinc-500"
                : healthy
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400")
            }
          >
            <Icon className="size-5" />
          </div>

          {/* Status pill */}
          <div
            className={
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ring-1 ring-inset " +
              (unknown
                ? "bg-zinc-800/50 text-zinc-500 ring-white/10"
                : healthy
                ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                : "bg-red-500/10 text-red-400 ring-red-500/20")
            }
          >
            <span
              className={
                "size-1.5 rounded-full " +
                (unknown
                  ? "bg-zinc-600"
                  : healthy
                  ? "animate-pulse bg-emerald-400"
                  : "bg-red-400")
              }
            />
            {unknown ? "Unknown" : healthy ? "Healthy" : "Unhealthy"}
          </div>
        </div>

        <p className="text-[15px] font-semibold text-zinc-100">{name}</p>
        <p className="mt-0.5 text-[12px] text-zinc-600">{description}</p>

        {/* Extra info */}
        {check?.version && (
          <p className="mt-3 text-[11px] text-zinc-600">
            Version: <span className="text-zinc-400">{check.version}</span>
          </p>
        )}
        {check?.active_connections !== undefined && (
          <p className="mt-1 text-[11px] text-zinc-600">
            Active connections:{" "}
            <span className="text-zinc-400">{check.active_connections}</span>
          </p>
        )}
        {check?.error && (
          <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
            {check.error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Uptime history dot ───────────────────────────────────────────────────────

function HistoryDot({ status }: { status: "healthy" | "unhealthy" | "unknown" }) {
  return (
    <div
      title={status}
      className={
        "h-6 w-2.5 rounded-sm " +
        (status === "healthy"
          ? "bg-emerald-500/70"
          : status === "unhealthy"
          ? "bg-red-500/70"
          : "bg-zinc-800")
      }
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type HistoryEntry = { ts: string; status: "healthy" | "unhealthy" };

export default function StatusPage() {
  const [data, setData]         = useState<ReadinessResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastChecked, setLC]    = useState("");
  const [history, setHistory]   = useState<HistoryEntry[]>([]);
  const [autoRefresh, setAR]    = useState(true);
  const isDemo = useDemo();

  const check = useCallback(async () => {
    if (isDemo) {
      const demoData: ReadinessResponse = {
        status: "ready",
        checks: {
          postgres: { status: "healthy", version: "16.2" },
          redis: { status: "healthy", active_connections: 3 },
          worker: { status: "healthy" },
        },
      };
      setData(demoData);
      setLC(timeNow());
      setHistory((prev) => [{ ts: timeNow(), status: "healthy" }, ...prev.slice(0, 39)]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await getReadiness();
      setData(r);
      setLC(timeNow());
      setHistory((prev) => [
        { ts: timeNow(), status: r.status === "ready" ? "healthy" : "unhealthy" },
        ...prev.slice(0, 39),
      ]);
    } catch {
      setData(null);
      setHistory((prev) => [{ ts: timeNow(), status: "unhealthy" }, ...prev.slice(0, 39)]);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  // Set page title
  useEffect(() => { document.title = "Status · Acheron"; }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [autoRefresh, check]);

  const allHealthy = data?.status === "ready";
  const services = [
    {
      key: "postgres" as const,
      name: "PostgreSQL",
      icon: Database,
      desc: "Users, API keys, tier configuration",
    },
    {
      key: "redis" as const,
      name: "Redis",
      icon: Zap,
      desc: "Rate limiting, key validation cache",
    },
    {
      key: "worker" as const,
      name: "gRPC Worker",
      icon: Cpu,
      desc: "Inference engine — Claude API bridge",
    },
  ];

  return (
    <div className="min-h-screen px-8 py-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-zinc-50">System Status</h1>
          <p className="mt-0.5 text-[13px] text-zinc-600">
            Real-time health of all infrastructure services.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAR(!autoRefresh)}
            className={
              "flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] transition " +
              (autoRefresh
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/[0.03] text-zinc-500 hover:text-zinc-300")
            }
          >
            <Activity className={"size-3.5 " + (autoRefresh ? "animate-pulse" : "")} />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <button
            onClick={check}
            disabled={loading}
            className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[13px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200 disabled:opacity-40"
          >
            <RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Overall banner ──────────────────────────────────────────────── */}
      <div
        className={
          "mb-6 flex items-center gap-4 rounded-2xl border p-5 " +
          (loading
            ? "border-white/[0.06] bg-white/[0.02]"
            : allHealthy
            ? "border-emerald-500/10 bg-emerald-500/[0.05]"
            : "border-red-500/20 bg-red-500/[0.07]")
        }
      >
        {loading ? (
          <Loader2 className="size-8 animate-spin text-zinc-600" />
        ) : allHealthy ? (
          <CheckCircle2 className="size-8 text-emerald-400" />
        ) : (
          <XCircle className="size-8 text-red-400" />
        )}
        <div>
          <p className="text-[15px] font-semibold text-zinc-100">
            {loading
              ? "Checking services…"
              : allHealthy
              ? "All systems operational"
              : "Degraded — one or more services are unhealthy"}
          </p>
          {lastChecked && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-zinc-600">
              <Clock className="size-3.5" />
              Last checked at {lastChecked}
              {autoRefresh && <span className="text-zinc-700">· refreshes every 15s</span>}
            </p>
          )}
        </div>
      </div>

      {/* ── Service cards ────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {services.map((s) => (
          <ServiceCard
            key={s.key}
            name={s.name}
            icon={s.icon}
            check={data?.checks[s.key]}
            description={s.desc}
          />
        ))}
      </div>

      {/* ── Uptime history ───────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-zinc-200">Check history</p>
              <p className="mt-0.5 text-[12px] text-zinc-600">
                Last {history.length} checks — newest on the right
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-emerald-500/70" />Healthy
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-red-500/70" />Unhealthy
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-zinc-800" />Unknown
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1">
            {/* Pad to 40 */}
            {Array.from({ length: Math.max(0, 40 - history.length) }).map((_, i) => (
              <HistoryDot key={"pad-" + i} status="unknown" />
            ))}
            {[...history].reverse().map((h, i) => (
              <HistoryDot key={i} status={h.status} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-700">
            <span>40 checks ago</span>
            <span>Now</span>
          </div>
        </div>
      )}

      {/* ── Architecture info ────────────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <p className="mb-4 text-[13px] font-semibold text-zinc-200">Architecture</p>
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 text-[12px] text-zinc-500">
          {[
            { label: "Client", icon: Server },
            null,
            { label: "Gateway\n(FastAPI)", icon: Activity },
            null,
            { label: "Worker\n(gRPC)", icon: Cpu },
            null,
            { label: "Anthropic\nClaude API", icon: Zap },
          ].map((item, i) =>
            item === null ? (
              <div key={i} className="text-zinc-800">──→</div>
            ) : (
              <div
                key={i}
                className="flex min-w-[80px] flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center"
              >
                <item.icon className="size-5 text-zinc-500" />
                <p className="whitespace-pre text-[11px] leading-tight text-zinc-500">{item.label}</p>
              </div>
            )
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "PostgreSQL", desc: "Users · Keys · Tiers", icon: Database },
            { label: "Redis", desc: "Rate limits · Key cache", icon: Zap },
            { label: "ClickHouse", desc: "Request logs · Analytics", icon: BarChart3 },
          ].map((d) => (
            <div
              key={d.label}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-2.5"
            >
              <d.icon className="size-4 text-zinc-600" />
              <div>
                <p className="text-[12px] font-medium text-zinc-400">{d.label}</p>
                <p className="text-[11px] text-zinc-700">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


