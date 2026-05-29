"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  accentColor?: string;
  trend?: number;
  children?: ReactNode;
  delay?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accentColor = "#8b5cf6",
  trend,
  children,
  delay = 0,
}: StatCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const TrendIcon = trend == null ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendColor = trend == null ? "#6b7280" : trend > 0 ? "#34d399" : "#fb7185";

  return (
    <Card
      className={cn(
        "relative overflow-hidden card-glow group transition-all duration-500",
        !mounted && "opacity-0 translate-y-4"
      )}
      style={{
        transitionDelay: `${delay}ms`,
        background: `linear-gradient(135deg, ${accentColor}06 0%, transparent 60%)`,
      }}
    >
      <CardContent className="relative p-5">
        {/* Accent glow — top edge */}
        <div
          className="absolute top-0 left-4 right-4 h-[1px] opacity-40 group-hover:opacity-70 transition-opacity"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
          }}
        />

        {/* Corner glow orb */}
        <div
          className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle, ${accentColor}10 0%, transparent 70%)`,
            filter: "blur(12px)",
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
              border: `1px solid ${accentColor}20`,
              boxShadow: `0 0 12px ${accentColor}10`,
            }}
          >
            {icon}
          </div>

          {trend != null && (
            <div
              className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: trendColor,
                background: trend > 0 ? "rgba(52,211,153,0.08)" : "rgba(251,113,133,0.08)",
                border: `1px solid ${trendColor}20`,
              }}
            >
              <TrendIcon className="w-3 h-3" />
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Value */}
        <p className="text-2xl font-bold tracking-tight text-foreground leading-none stat-value">
          {value}
        </p>
        <p className="text-sm mt-1.5 font-medium text-muted-foreground">
          {title}
        </p>
        {subtitle && (
          <p className="text-[11px] mt-0.5 truncate text-muted-foreground/50">
            {subtitle}
          </p>
        )}

        {/* Sparkline slot */}
        {children && <div className="mt-4 h-12">{children}</div>}
      </CardContent>
    </Card>
  );
}
