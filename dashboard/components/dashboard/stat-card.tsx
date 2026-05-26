"use client";

import { useEffect, useState, type ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
  trend?: number;
  glowClass?: string;
  accentColor?: string;
  children?: ReactNode;
  delay?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  trend,
  glowClass,
  accentColor = "#8b5cf6",
  children,
  delay = 0,
}: StatCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const TrendIcon =
    trend == null ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendColor =
    trend == null ? "#6b7280" : trend > 0 ? "#34d399" : "#fb7185";

  return (
    <div
      className={cn("glass-card-hover p-5 flex flex-col gap-3", glowClass)}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {/* ── Header row ── */}
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110"
          style={{
            background: iconBg || `${accentColor}20`,
            border: `1px solid ${accentColor}30`,
            boxShadow: `0 0 12px ${accentColor}25`,
          }}
        >
          {icon}
        </div>

        {/* Trend badge */}
        {trend != null && (
          <div
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
            style={{
              color: trendColor,
              background: trend > 0 ? "rgba(52,211,153,0.1)" : trend < 0 ? "rgba(251,113,113,0.1)" : "rgba(107,114,128,0.1)",
              border: `1px solid ${trendColor}25`,
            }}
          >
            <TrendIcon className="w-3 h-3" />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      {/* ── Value ── */}
      <div>
        <p
          className="text-2xl font-bold tracking-tight"
          style={{
            color: "var(--color-foreground)",
            animation: mounted ? "count-rise 0.4s ease-out both" : "none",
            animationDelay: `${delay + 100}ms`,
          }}
        >
          {value}
        </p>
        <p
          className="text-sm font-medium mt-0.5"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: "var(--color-muted-foreground)", opacity: 0.55 }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Accent bar ── */}
      <div
        className="h-px rounded-full"
        style={{
          background: `linear-gradient(90deg, ${accentColor}50, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* ── Sparkline slot ── */}
      {children && <div className="h-12">{children}</div>}
    </div>
  );
}
