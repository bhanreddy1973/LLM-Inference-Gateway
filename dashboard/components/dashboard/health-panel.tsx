"use client";

import { Database, Server, Radio, BarChart2 } from "lucide-react";
import type { HealthStatus } from "@/types/api";

const SERVICES = [
  { key: "postgres",   label: "PostgreSQL",  Icon: Database,  accentColor: "#a78bfa" },
  { key: "redis",      label: "Redis",       Icon: Server,    accentColor: "#22d3ee" },
  { key: "worker",     label: "gRPC Worker", Icon: Radio,     accentColor: "#34d399" },
  { key: "clickhouse", label: "ClickHouse",  Icon: BarChart2, accentColor: "#fbbf24" },
] as const;

type ServiceStatus = "healthy" | "degraded" | "unhealthy" | undefined;

const STATUS_MAP = {
  healthy:   { dot: "status-dot-healthy",   label: "Healthy",  color: "#34d399" },
  degraded:  { dot: "status-dot-degraded",  label: "Degraded", color: "#fbbf24" },
  unhealthy: { dot: "status-dot-unhealthy", label: "Down",     color: "#f87171" },
};

function StatusDot({ status }: { status: ServiceStatus }) {
  const s = STATUS_MAP[status ?? "unhealthy"];
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: s.color }}>
      <span className={s.dot} />
      {s.label}
    </span>
  );
}

export function HealthPanel({ health }: { health?: HealthStatus }) {
  const allHealthy = SERVICES.every(
    (s) => health?.[s.key]?.status === "healthy",
  );

  return (
    <div className="glass-card p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
          System Health
        </p>
        <span
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={
            allHealthy
              ? { background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }
              : { background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }
          }
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: allHealthy ? "#34d399" : "#fbbf24",
              boxShadow: `0 0 6px ${allHealthy ? "#34d399" : "#fbbf24"}`,
              animation: "live-dot 1.8s ease-in-out infinite",
            }}
          />
          {allHealthy ? "All Systems Go" : "Degraded"}
        </span>
      </div>

      {/* Service grid */}
      <div className="space-y-2">
        {SERVICES.map(({ key, label, Icon, accentColor }, idx) => {
          const svc = health?.[key];
          const status = svc?.status as ServiceStatus;
          const isHealthy = status === "healthy";

          return (
            <div
              key={key}
              className="flex items-center justify-between p-2.5 rounded-xl transition-all duration-300"
              style={{
                background: isHealthy
                  ? "rgba(52,211,153,0.04)"
                  : "rgba(255,255,255,0.025)",
                border: `1px solid ${isHealthy ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)"}`,
                animationDelay: `${idx * 0.06}s`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${accentColor}15`,
                    border: `1px solid ${accentColor}20`,
                  }}
                >
                  <Icon
                    className="w-3 h-3"
                    style={{ color: isHealthy ? accentColor : "var(--color-muted-foreground)" }}
                  />
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: isHealthy ? "var(--color-card-foreground)" : "var(--color-muted-foreground)" }}
                >
                  {label}
                </span>
              </div>

              <StatusDot status={status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
