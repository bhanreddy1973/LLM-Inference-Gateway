"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Server, Radio, BarChart2, CheckCircle2, AlertCircle } from "lucide-react";
import type { HealthStatus } from "@/types/api";

const SERVICES = [
  { key: "postgres",   label: "PostgreSQL",  Icon: Database,  color: "#a78bfa" },
  { key: "redis",      label: "Redis",       Icon: Server,    color: "#22d3ee" },
  { key: "worker",     label: "gRPC Worker", Icon: Radio,     color: "#34d399" },
  { key: "clickhouse", label: "ClickHouse",  Icon: BarChart2, color: "#fbbf24" },
] as const;

type SvcStatus = "healthy" | "degraded" | "unhealthy" | undefined;

const STATUS_CFG = {
  healthy:   { label: "Healthy",  dotClass: "dot-healthy",   color: "#34d399" },
  degraded:  { label: "Degraded", dotClass: "dot-degraded",  color: "#fbbf24" },
  unhealthy: { label: "Down",     dotClass: "dot-unhealthy", color: "#fb7185" },
};

export function HealthPanel({ health }: { health?: HealthStatus }) {
  const allHealthy = SERVICES.every((s) => health?.[s.key]?.status === "healthy");
  const anyData = !!health;

  return (
    <Card className="h-full relative overflow-hidden">
      {/* Subtle corner accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-30"
        style={{
          background: allHealthy
            ? "radial-gradient(circle at 100% 0%, rgba(52,211,153,0.12) 0%, transparent 70%)"
            : "radial-gradient(circle at 100% 0%, rgba(251,191,36,0.12) 0%, transparent 70%)",
        }}
      />

      <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle className="text-sm font-semibold">System Health</CardTitle>
        {anyData && (
          <Badge
            variant="outline"
            className="h-auto text-[11px] font-semibold gap-1.5 px-2.5 py-1 rounded-full"
            style={
              allHealthy
                ? { background: "rgba(52,211,153,0.08)", color: "#34d399", borderColor: "rgba(52,211,153,0.2)" }
                : { background: "rgba(251,191,36,0.08)", color: "#fbbf24", borderColor: "rgba(251,191,36,0.2)" }
            }
          >
            {allHealthy
              ? <CheckCircle2 className="w-3 h-3" />
              : <AlertCircle className="w-3 h-3" />
            }
            {allHealthy ? "All Systems Go" : "Degraded"}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-2 pt-4">
        {SERVICES.map(({ key, label, Icon, color }, idx) => {
          const svc    = health?.[key];
          const status = (svc?.status ?? "unhealthy") as SvcStatus;
          const cfg    = STATUS_CFG[status ?? "unhealthy"];
          const ok     = status === "healthy";

          return (
            <div
              key={key}
              className="group flex items-center justify-between p-3 rounded-xl transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: ok ? `${color}06` : "rgba(255,255,255,0.015)",
                border: `1px solid ${ok ? `${color}12` : "rgba(255,255,255,0.04)"}`,
                opacity: anyData ? 1 : 0.4,
                animationDelay: `${idx * 80}ms`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${color}12, ${color}06)`,
                    border: `1px solid ${color}18`,
                    boxShadow: ok ? `0 0 8px ${color}10` : "none",
                  }}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: ok ? color : "var(--color-text-3)" }}
                    strokeWidth={1.8}
                  />
                </div>
                <span className="text-xs font-medium" style={{ color: ok ? "var(--color-text)" : "var(--color-text-3)" }}>
                  {label}
                </span>
              </div>

              <span className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: cfg.color }}>
                <span className={cfg.dotClass} />
                {cfg.label}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
