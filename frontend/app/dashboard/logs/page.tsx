"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  ScrollText,
  X,
  Zap,
} from "lucide-react";
import { getLogs, type LogEntry, type LogsResponse } from "@/lib/api";
import { useDemo } from "@/lib/demo-context";
import { DEMO_LOGS } from "@/lib/demo-data";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
  "claude-sonnet-4-20250514",
  "claude-haiku-4-20250514",
];

const STATUS_OPTIONS = [200, 400, 429, 500, 502];

const STATUS_STYLE: Record<number, string> = {
  200: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
  400: "text-amber-400  bg-amber-500/10  ring-amber-500/20",
  429: "text-amber-400  bg-amber-500/10  ring-amber-500/20",
  500: "text-red-400    bg-red-500/10    ring-red-500/20",
  502: "text-red-400    bg-red-500/10    ring-red-500/20",
};

const STATUS_DOT: Record<number, string> = {
  200: "bg-emerald-400",
  400: "bg-amber-400",
  429: "bg-amber-400",
  500: "bg-red-400",
  502: "bg-red-400",
};

const PERIOD_OPTIONS = [
  { label: "Today",  value: 1 },
  { label: "7d",     value: 7 },
  { label: "30d",    value: 30 },
  { label: "90d",    value: 90 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortModel(m: string) {
  return m.replace("claude-", "").replace(/-\d{8}$/, "");
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Row expanded detail ──────────────────────────────────────────────────────

function ExpandedRow({ row }: { row: LogEntry }) {
  return (
    <div className="grid grid-cols-4 gap-4 bg-white/[0.015] px-5 py-4 text-[12px]">
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-700">Request ID</p>
        <p className="font-mono text-zinc-400 break-all">{row.request_id}</p>
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-700">Tokens</p>
        <p className="text-zinc-400">{fmt(row.input_tokens)} in · {fmt(row.output_tokens)} out · {fmt(row.total_tokens)} total</p>
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-700">Performance</p>
        <p className="text-zinc-400">TTFT: {row.time_to_first_token_ms}ms · Total: {row.total_latency_ms}ms</p>
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-700">Details</p>
        <p className="text-zinc-400">
          Temp: {row.temperature.toFixed(1)} · {row.stream ? "Streaming" : "Batch"}
          {" · "}Finish: <span className="capitalize">{row.finish_reason}</span>
          <br />Cost: ${row.estimated_cost_usd.toFixed(6)} · Key: {row.api_key_prefix}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [data, setData]           = useState<LogsResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const isDemo = useDemo();

  // Filters
  const [model, setModel]         = useState("");
  const [status, setStatus]       = useState<number | "">("");
  const [days, setDays]           = useState(30);
  const [page, setPage]           = useState(1);
  const pageSize                  = 50;

  // Expanded row
  const [expanded, setExpanded]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemo) {
      setData({ items: DEMO_LOGS, total: DEMO_LOGS.length, page: 1, page_size: 50 });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await getLogs({
        page,
        page_size: pageSize,
        model:       model || undefined,
        status_code: status !== "" ? status : undefined,
        days,
      });
      setData(r);
    } catch {
      setError("Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, [page, model, status, days, isDemo]);

  // Set page title
  useEffect(() => { document.title = "Logs · Acheron"; }, []);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  function applyFilter(cb: () => void) {
    cb();
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const activeFilters = [model && `Model: ${shortModel(model)}`, status !== "" && `Status: ${status}`].filter(Boolean);

  return (
    <div className="min-h-screen px-8 py-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-zinc-50">Request Logs</h1>
          <p className="mt-0.5 text-[13px] text-zinc-600">
            Full history of every inference request — filter, paginate, inspect.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[13px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200 disabled:opacity-40"
        >
          <RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} />
          Refresh
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Period */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => applyFilter(() => setDays(o.value))}
              className={"rounded-lg px-3 py-1.5 text-[12px] font-medium transition " +
                (days === o.value ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-300")}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Model filter */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
          <Filter className="size-3.5 text-zinc-700" />
          <select
            value={model}
            onChange={(e) => applyFilter(() => setModel(e.target.value))}
            className="bg-transparent text-[12px] text-zinc-400 focus:outline-none"
          >
            <option value="">All models</option>
            {MODELS.map((m) => (
              <option key={m} value={m}>{shortModel(m)}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
          <Filter className="size-3.5 text-zinc-700" />
          <select
            value={status}
            onChange={(e) => applyFilter(() => setStatus(e.target.value === "" ? "" : Number(e.target.value)))}
            className="bg-transparent text-[12px] text-zinc-400 focus:outline-none"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Active filter pills */}
        {activeFilters.map((f) => (
          <span
            key={String(f)}
            className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-400 ring-1 ring-inset ring-violet-500/20"
          >
            {String(f)}
            <button onClick={() => {
              if (String(f).startsWith("Model")) applyFilter(() => setModel(""));
              else applyFilter(() => setStatus(""));
            }}>
              <X className="size-3" />
            </button>
          </span>
        ))}

        {/* Count */}
        {data && (
          <span className="ml-auto text-[12px] text-zinc-600">
            {data.total.toLocaleString()} requests
          </span>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4 text-[13px] text-red-400">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_80px_80px_80px_90px_80px_60px] gap-3 border-b border-white/[0.06] px-5 py-3">
          {["Request ID", "Model", "Input", "Output", "Latency", "Status", "Cost", "Time"].map((h) => (
            <span key={h} className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">{h}</span>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-zinc-600">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-[13px]">Loading logs…</span>
          </div>
        )}

        {/* Empty */}
        {!loading && data?.items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <ScrollText className="size-10 text-zinc-800" />
            <p className="text-[13px] text-zinc-600">No requests found for this period and filter.</p>
          </div>
        )}

        {/* Rows */}
        {!loading && data?.items.map((row) => {
          const st = STATUS_STYLE[row.status_code] ?? "text-zinc-400 bg-zinc-500/10 ring-zinc-500/20";
          const dot = STATUS_DOT[row.status_code] ?? "bg-zinc-600";
          const isExpanded = expanded === row.request_id;

          return (
            <div key={row.request_id}>
              <button
                onClick={() => setExpanded(isExpanded ? null : row.request_id)}
                className="grid w-full grid-cols-[2fr_1fr_80px_80px_80px_90px_80px_60px] items-center gap-3 px-5 py-3 text-left transition hover:bg-white/[0.02]"
              >
                <span className="truncate font-mono text-[11px] text-zinc-600">
                  {row.request_id.slice(0, 20)}…
                </span>
                <span className="truncate text-[12px] text-zinc-400">{shortModel(row.model)}</span>
                <span className="text-[12px] text-zinc-500">{fmt(row.input_tokens)}</span>
                <span className="text-[12px] text-zinc-500">{fmt(row.output_tokens)}</span>
                <div className="flex items-center gap-1 text-[12px] text-zinc-500">
                  <Clock className="size-3 shrink-0 text-zinc-700" />
                  {row.total_latency_ms}ms
                </div>
                <span className={"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset " + st}>
                  <span className={"size-1.5 rounded-full " + dot} />
                  {row.status_code}
                </span>
                <div className="flex items-center gap-1 text-[12px] text-zinc-500">
                  <Zap className="size-3 shrink-0 text-zinc-700" />
                  ${row.estimated_cost_usd.toFixed(5)}
                </div>
                <span className="text-[11px] text-zinc-600">{timeAgo(row.created_at)}</span>
              </button>

              {isExpanded && <ExpandedRow row={row} />}
            </div>
          );
        })}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {!loading && data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px] text-zinc-600">
            Page {page} of {totalPages} · {data.total.toLocaleString()} total
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex size-8 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-500 transition hover:border-white/10 hover:text-zinc-300 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = page <= 4 ? i + 1 : page - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={"flex size-8 items-center justify-center rounded-lg border text-[12px] transition " +
                    (p === page
                      ? "border-white/20 bg-white/[0.08] text-zinc-100"
                      : "border-white/[0.06] text-zinc-600 hover:border-white/10 hover:text-zinc-300")}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex size-8 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-500 transition hover:border-white/10 hover:text-zinc-300 disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
