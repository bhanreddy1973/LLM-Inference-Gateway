"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, LayoutDashboard, Activity, BarChart3, Key, Settings, LogOut,
  Sparkles,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { href: "/dashboard",  label: "Overview",   icon: LayoutDashboard },
      { href: "/monitoring", label: "Monitoring", icon: Activity },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/keys",     label: "API Keys",  icon: Key },
      { href: "/settings", label: "Settings",  icon: Settings },
    ],
  },
];

const TIER_STYLES: Record<string, { color: string; bg: string; border: string; label: string; icon?: boolean }> = {
  enterprise: { label: "Enterprise", color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)", icon: true },
  pro:        { label: "Pro",        color: "#a78bfa", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)", icon: true },
  free:       { label: "Free",       color: "#67e8f9", bg: "rgba(6,182,212,0.1)",  border: "rgba(6,182,212,0.2)" },
};

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();

  const tier = TIER_STYLES[user?.tier ?? "free"] ?? TIER_STYLES.free;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full w-[244px] flex flex-col z-50",
        "bg-[var(--color-sidebar)]/95 border-r border-white/[0.04]",
        "backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed && "-translate-x-full"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.04]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.6), rgba(6,182,212,0.5))",
            border: "1px solid rgba(139,92,246,0.35)",
            boxShadow: "0 0 20px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-foreground leading-tight">
            LLM Gateway
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-medium">
            Inference Platform
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/50 px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-violet-500/12 to-cyan-500/8 border border-violet-500/15 text-foreground shadow-[0_0_12px_rgba(139,92,246,0.08)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                        active
                          ? "bg-violet-500/15 shadow-[0_0_8px_rgba(139,92,246,0.15)]"
                          : "bg-white/[0.03] group-hover:bg-white/[0.06]"
                      )}
                    >
                      <Icon
                        className="w-3.5 h-3.5 shrink-0"
                        strokeWidth={active ? 2.2 : 1.8}
                        style={{ color: active ? "#a78bfa" : undefined }}
                      />
                    </div>
                    <span>{label}</span>
                    {active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.6)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 px-3 py-4 border-t border-white/[0.04]">
        {/* User card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 relative"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              color: "#fff",
              fontSize: 11,
              boxShadow: "0 0 12px rgba(139,92,246,0.2)",
            }}
          >
            {(user?.name ?? user?.email ?? "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium text-xs text-foreground leading-tight">
              {user?.name ?? user?.email ?? "User"}
            </p>
            <Badge
              variant="outline"
              className="mt-1 h-auto px-1.5 py-0 text-[9px] font-bold gap-1"
              style={{ background: tier.bg, color: tier.color, borderColor: tier.border }}
            >
              {tier.icon && <Sparkles className="w-2.5 h-2.5" />}
              {tier.label}
            </Badge>
          </div>
        </div>

        {/* Sign out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { logout(); router.push("/login"); }}
          className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground text-xs h-8 rounded-lg"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
          <span>Sign out</span>
        </Button>
      </div>
    </aside>
  );
}
