"use client";

import {
  Shield,
  Gauge,
  Radio,
  Server,
  BarChart3,
  LayoutDashboard,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FeatureItem = {
  icon: React.ElementType;
  title: string;
  description: string;
  badge: string;
  gridClass: string;
  visual: React.ReactNode;
};

/* ------------------------------------------------------------------ */
/*  Minimal monochrome visuals                                         */
/* ------------------------------------------------------------------ */

function AuthVisual() {
  return (
    <div className="relative mt-auto flex h-[120px] items-center justify-center overflow-hidden">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="h-8 w-5 rounded bg-gradient-to-b from-amber-500/25 to-amber-500/5 ring-1 ring-amber-500/10"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{
              duration: 2.4,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RateLimitVisual() {
  return (
    <div className="relative mt-auto flex h-[120px] items-end overflow-hidden px-5 pb-4">
      <div className="flex w-full items-end justify-between gap-1">
        {[40, 55, 30, 70, 45, 85, 35, 60, 50, 75, 40, 65].map((h, i) => (
          <motion.div
            key={i}
            className="w-full rounded-t-sm bg-gradient-to-t from-sky-500/30 to-sky-400/5"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{
              duration: 0.8,
              delay: i * 0.05,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
      <div className="absolute left-5 right-5 top-[35%] border-t border-dashed border-sky-400/20" />
    </div>
  );
}

function StreamingVisual() {
  return (
    <div className="relative mt-auto flex h-[120px] flex-col items-start justify-center gap-2.5 overflow-hidden px-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="shrink-0 font-mono text-xs text-emerald-500/40">
            data:
          </span>
          <motion.div
            className="h-2.5 rounded-sm bg-gradient-to-r from-emerald-500/25 to-emerald-500/5"
            initial={{ width: 0, opacity: 0 }}
            animate={{
              width: [0, 80 + i * 24, 80 + i * 24],
              opacity: [0, 1, 0.4],
            }}
            transition={{
              duration: 2.5,
              delay: i * 0.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        </div>
      ))}
      <motion.span
        className="font-mono text-xs text-emerald-500/40"
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ duration: 2.5, delay: 1.8, repeat: Infinity }}
      >
        data: [DONE]
      </motion.span>
    </div>
  );
}

function GrpcVisual() {
  return (
    <div className="relative mt-auto flex h-[120px] items-center justify-center overflow-hidden">
      <div className="relative z-10 flex size-10 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/15">
        <Server className="size-4 text-violet-400/60" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute flex size-6 items-center justify-center rounded-lg bg-violet-500/[0.06] ring-1 ring-violet-500/10"
          animate={{
            x: [
              Math.cos((i * 2 * Math.PI) / 3) * 48,
              Math.cos((i * 2 * Math.PI) / 3 + Math.PI) * 48,
              Math.cos((i * 2 * Math.PI) / 3) * 48,
            ],
            y: [
              Math.sin((i * 2 * Math.PI) / 3) * 32,
              Math.sin((i * 2 * Math.PI) / 3 + Math.PI) * 32,
              Math.sin((i * 2 * Math.PI) / 3) * 32,
            ],
          }}
          transition={{
            duration: 8,
            delay: i * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="size-1.5 rounded-full bg-violet-400/50" />
        </motion.div>
      ))}
    </div>
  );
}

function AnalyticsVisual() {
  return (
    <div className="relative mt-auto flex h-[120px] items-end overflow-hidden px-5 pb-4">
      <div className="flex w-full items-end justify-between gap-1.5">
        {[65, 40, 80, 55, 90, 45, 72, 60, 85, 50].map((h, i) => (
          <motion.div
            key={i}
            className="w-full rounded-t bg-gradient-to-t from-rose-500/25 to-rose-400/5"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{
              duration: 0.8,
              delay: i * 0.06,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DashboardVisual() {
  return (
    <div className="relative mt-auto flex h-[120px] items-center overflow-hidden px-5">
      <div className="flex w-full flex-col gap-3">
        {[
          { label: "Tokens", value: "1.2M", pct: 78 },
          { label: "Latency", value: "142ms", pct: 35 },
          { label: "Cost", value: "$4.28", pct: 55 },
        ].map(({ label, value, pct }, i) => (
          <div key={label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">{label}</span>
              <span className="font-mono text-xs text-zinc-500">{value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-cyan-500/[0.06]">
              <motion.div
                className="h-full rounded-full bg-cyan-400/25"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{
                  duration: 1,
                  delay: 0.2 + i * 0.12,
                  ease: "easeOut",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Features data                                                      */
/* ------------------------------------------------------------------ */

const features: FeatureItem[] = [
  {
    icon: Shield,
    title: "API Key Authentication",
    description:
      "SHA-256 hashed keys with Redis cache. Prefix-based format, key rotation, and 5-minute TTL for fast validation.",
    badge: "Security",
    gridClass: "md:col-span-2",
    visual: <AuthVisual />,
  },
  {
    icon: Gauge,
    title: "Per-Tier Rate Limiting",
    description:
      "Redis sliding window with sorted sets and Lua scripts. Free, Pro, and Enterprise tiers.",
    badge: "Control",
    gridClass: "md:col-span-1",
    visual: <RateLimitVisual />,
  },
  {
    icon: Radio,
    title: "Streaming Inference",
    description:
      "SSE streaming in OpenAI-compatible format. Real-time token delivery, chunk by chunk.",
    badge: "Real-time",
    gridClass: "md:col-span-1",
    visual: <StreamingVisual />,
  },
  {
    icon: Server,
    title: "gRPC Workers",
    description:
      "Scalable inference layer with circuit breaker, exponential backoff, and horizontal scaling.",
    badge: "Infrastructure",
    gridClass: "md:col-span-2",
    visual: <GrpcVisual />,
  },
  {
    icon: BarChart3,
    title: "Analytics Pipeline",
    description:
      "Async batched logging to ClickHouse with materialized views and zero latency impact.",
    badge: "Observability",
    gridClass: "md:col-span-1",
    visual: <AnalyticsVisual />,
  },
  {
    icon: LayoutDashboard,
    title: "Usage Dashboards",
    description:
      "Per-user breakdowns of tokens, cost, and latency with P95 tracking.",
    badge: "Insights",
    gridClass: "md:col-span-2",
    visual: <DashboardVisual />,
  },
];

/* ------------------------------------------------------------------ */
/*  Animation config                                                   */
/* ------------------------------------------------------------------ */

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      delay: i * 0.07,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FeaturesBentoGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {features.map((feature, i) => {
        const Icon = feature.icon;

        return (
          <motion.div
            key={feature.title}
            className={feature.gridClass}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            custom={i}
          >
            <Card className="group relative h-full border-0 bg-[#111113] ring-1 ring-white/[0.06] transition-all duration-300 hover:ring-white/[0.1]">
              <CardHeader className="relative z-10 gap-3 border-0 pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
                    <Icon
                      className="size-[18px] text-zinc-400"
                      strokeWidth={1.5}
                    />
                  </div>
                  <Badge
                    variant="outline"
                    className="h-[22px] border-white/[0.06] bg-white/[0.02] text-[11px] font-normal uppercase tracking-wider text-zinc-500"
                  >
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-base text-xl font-medium tracking-[-0.01em] text-zinc-200">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-[15px] leading-relaxed text-zinc-500">
                  {feature.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="relative z-10 flex flex-1 flex-col p-0">
                {feature.visual}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
