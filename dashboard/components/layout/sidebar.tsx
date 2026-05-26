"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Zap, LayoutDashboard, Activity, BarChart3, Key, Settings, LogOut, ChevronRight,
} from "lucide-react";

const NAV = [
  { href: "/dashboard",  label: "Overview",   icon: LayoutDashboard, color: "#a78bfa" },
  { href: "/monitoring", label: "Monitoring", icon: Activity,        color: "#22d3ee" },
  { href: "/analytics",  label: "Analytics",  icon: BarChart3,       color: "#34d399" },
  { href: "/keys",       label: "API Keys",   icon: Key,             color: "#fbbf24" },
  { href: "/settings",   label: "Settings",   icon: Settings,        color: "#94a3b8" },
];

const TIER_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  enterprise: { label: "Enterprise", color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)" },
  pro:        { label: "Pro",        color: "#a78bfa", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.25)" },
  free:       { label: "Free",       color: "#22d3ee", bg: "rgba(6,182,212,0.1)",   border: "rgba(6,182,212,0.25)"  },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const tier = TIER_BADGE[user?.tier ?? "free"] ?? TIER_BADGE.free;
  const initials = (user?.name ?? user?.email ?? "?")[0].toUpperCase();

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-40"
      style={{
        background: "rgba(5,5,15,0.85)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
      }}
    >
      {/* ── Logo ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-transform duration-300 hover:scale-110"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.45), rgba(6,182,212,0.35))",
            border: "1px solid rgba(139,92,246,0.4)",
            boxShadow: "0 0 20px rgba(139,92,246,0.3), 0 0 8px rgba(139,92,246,0.2) inset",
          }}
        >
          <Zap className="w-4.5 h-4.5" style={{ color: "#c4b5fd" }} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold gradient-text leading-tight tracking-tight">LLM Gateway</p>
          <p
            className="text-[10px] font-medium tracking-widest uppercase mt-0.5"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Dashboard
          </p>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, color }, idx) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(active ? "nav-item-active" : "nav-item")}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              <div
                className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all duration-200"
                style={
                  active
                    ? { background: `${color}20`, boxShadow: `0 0 10px ${color}40` }
                    : { background: "rgba(255,255,255,0.05)" }
                }
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={{ color: active ? color : "var(--color-muted-foreground)" }}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              <span className="flex-1 text-sm">{label}</span>
              {active && (
                <ChevronRight
                  className="w-3 h-3 flex-shrink-0 opacity-60"
                  style={{ color }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ──────────────────────────────────── */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 12px" }} />

      {/* ── User section ─────────────────────────────── */}
      <div className="px-3 py-4 space-y-2">
        {/* User card */}
        <div
          className="rounded-xl p-3 transition-all duration-200 hover:bg-white/5"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #0e7490)",
                color: "#fff",
                boxShadow: "0 0 12px rgba(124,58,237,0.4)",
                fontSize: "0.7rem",
              }}
            >
              {initials}
            </div>

            {/* Name + tier */}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold truncate leading-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                {user?.name ?? user?.email ?? "User"}
              </p>
              <span
                className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: tier.bg,
                  color: tier.color,
                  border: `1px solid ${tier.border}`,
                }}
              >
                {tier.label}
              </span>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left transition-colors duration-200"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
            style={{ background: "rgba(248,113,113,0.08)" }}
          >
            <LogOut className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
          </div>
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
