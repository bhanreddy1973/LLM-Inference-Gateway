"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, Activity, BarChart3, Key, Settings,
  ChevronRight, Bell, Search,
} from "lucide-react";

const ROUTE_META: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  "/dashboard":  { title: "Overview",   description: "Platform health & usage at a glance", icon: LayoutDashboard },
  "/monitoring": { title: "Monitoring", description: "Live traffic, latency & error tracking",  icon: Activity },
  "/analytics":  { title: "Analytics",  description: "Usage trends, costs & model breakdown",   icon: BarChart3 },
  "/keys":       { title: "API Keys",   description: "Manage and rotate your access credentials", icon: Key },
  "/settings":   { title: "Settings",   description: "Gateway configuration & preferences",      icon: Settings },
};

function matchRoute(pathname: string) {
  for (const [route, meta] of Object.entries(ROUTE_META)) {
    if (pathname === route || pathname.startsWith(route + "/")) return meta;
  }
  return { title: "Dashboard", description: "", icon: LayoutDashboard };
}

export function Header() {
  const pathname = usePathname();
  const { user }  = useAuth();

  const { title, description, icon: Icon } = matchRoute(pathname);

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between gap-4 px-6 bg-[var(--color-header)] border-b border-white/[0.04] backdrop-blur-xl">
      {/* Left: page identity */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <span className="font-medium">Gateway</span>
          <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />
          <span className="text-foreground/80 font-medium">{title}</span>
        </div>

        <Separator orientation="vertical" className="h-4 bg-white/[0.06]" />

        {/* Page icon + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))",
              border: "1px solid rgba(139,92,246,0.18)",
              boxShadow: "0 0 8px rgba(139,92,246,0.08)",
            }}
          >
            <Icon className="w-3.5 h-3.5 text-violet-300" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-[11px] text-muted-foreground/60 truncate hidden sm:block leading-tight">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search hint */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:flex items-center gap-2 h-8 px-3 text-xs text-muted-foreground/50 bg-white/[0.02] border border-white/[0.05] rounded-lg hover:border-violet-500/20 hover:text-muted-foreground transition-all"
        >
          <Search className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>Search...</span>
          <kbd className="ml-2 text-[10px] font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">⌘K</kbd>
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative h-8 w-8 rounded-lg hover:bg-white/[0.04]">
          <Bell className="w-4 h-4" strokeWidth={1.8} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_4px_rgba(167,139,250,0.6)]" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1 bg-white/[0.06]" />

        {/* User chip */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-violet-500/15 transition-colors cursor-pointer">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              color: "#fff",
              boxShadow: "0 0 8px rgba(139,92,246,0.2)",
            }}
          >
            {(user?.name ?? user?.email ?? "U")[0].toUpperCase()}
          </div>
          <span className="text-xs font-medium text-foreground/70 hidden sm:block truncate max-w-28">
            {user?.name ?? user?.email ?? "User"}
          </span>
        </div>
      </div>
    </header>
  );
}
