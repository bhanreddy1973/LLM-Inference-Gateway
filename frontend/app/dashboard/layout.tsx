"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Key,
  BarChart3,
  MessageSquare,
  LogOut,
  ChevronRight,
  Loader2,
  ScrollText,
  Activity,
  Settings,
} from "lucide-react";
import { getMe, removeToken, isAuthenticated, ApiError, type UserResponse } from "@/lib/api";

const NAV = [
  { href: "/dashboard",            label: "Overview",   icon: LayoutDashboard },
  { href: "/dashboard/keys",       label: "API Keys",   icon: Key },
  { href: "/dashboard/usage",      label: "Analytics",  icon: BarChart3 },
  { href: "/dashboard/logs",       label: "Logs",       icon: ScrollText },
  { href: "/dashboard/playground", label: "Playground", icon: MessageSquare },
  { href: "/dashboard/status",     label: "Status",     icon: Activity },
  { href: "/dashboard/settings",   label: "Settings",   icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no token at all — bounce immediately
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    getMe()
      .then((u) => {
        setUser(u);
        setLoading(false);
      })
      .catch((err) => {
        // Only clear token + redirect on an actual auth failure (401 / 403)
        // Network errors or backend being down should NOT log the user out
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          removeToken();
          router.replace("/login");
        } else {
          // Backend unreachable — still show the dashboard skeleton
          setLoading(false);
        }
      });
  }, [router]);

  function handleLogout() {
    removeToken();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <Loader2 className="size-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#09090b]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-white/[0.06] bg-[#0c0c0e]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-5">
          <div className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1L14.9282 5V11L8 15L1.07179 11V5L8 1Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                className="text-zinc-300"
              />
              <path
                d="M8 5L11.4641 7V9L8 11L4.53589 9V7L8 5Z"
                fill="currentColor"
                fillOpacity="0.3"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
                className="text-zinc-300"
              />
            </svg>
          </div>
          <span className="text-[14px] font-semibold tracking-[-0.02em] text-zinc-100">
            Acheron
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all ${
                  active
                    ? "bg-white/[0.08] text-zinc-50"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 transition-colors ${
                    active ? "text-zinc-300" : "text-zinc-600 group-hover:text-zinc-400"
                  }`}
                />
                {label}
                {active && <ChevronRight className="ml-auto size-3 text-zinc-600" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 text-[11px] font-semibold text-zinc-200">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-zinc-300">
                {user?.name ?? "User"}
              </p>
              <p className="truncate text-[11px] capitalize text-zinc-600">
                {user?.tier ?? "free"} plan
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition-all hover:bg-white/[0.04] hover:text-zinc-400"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-[220px] flex-1">{children}</main>
    </div>
  );
}
