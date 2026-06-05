"use client";

import { useEffect, useState, useCallback } from "react";
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
  Eye,
} from "lucide-react";
import { getMe, removeToken, type UserResponse } from "@/lib/api";
import { exitDemoMode } from "@/lib/demo";
import { DemoProvider } from "@/lib/demo-context";
import { DEMO_USER } from "@/lib/demo-data";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/keys", label: "API Keys", icon: Key },
  { href: "/dashboard/usage", label: "Usage", icon: BarChart3 },
  { href: "/dashboard/playground", label: "Playground", icon: MessageSquare },
];

// Check if demo mode is active
function checkDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("demo") === "1") return true;
  return window.localStorage.getItem("demo_mode") === "true";
}

type AuthState =
  | { status: "loading" }
  | { status: "demo" }
  | { status: "authenticated"; user: UserResponse }
  | { status: "unauthenticated" };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });

  const resolveAuth = useCallback(async () => {
    // 1. Check demo mode
    if (checkDemoMode()) {
      window.localStorage.setItem("demo_mode", "true");
      if (window.location.search.includes("demo=1")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      setAuthState({ status: "demo" });
      return;
    }

    // 2. Check token
    const token = window.localStorage.getItem("access_token");
    if (!token) {
      setAuthState({ status: "unauthenticated" });
      return;
    }

    // 3. Validate token
    try {
      const user = await getMe();
      setAuthState({ status: "authenticated", user });
    } catch {
      window.localStorage.removeItem("access_token");
      setAuthState({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    resolveAuth();
  }, [resolveAuth]);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.replace("/login");
    }
  }, [authState.status, router]);

  function handleLogout() {
    if (authState.status === "demo") {
      exitDemoMode();
    } else {
      removeToken();
    }
    router.push("/login");
  }

  if (authState.status === "loading" || authState.status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <Loader2 className="size-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  const demo = authState.status === "demo";
  const user = demo ? DEMO_USER : (authState as { status: "authenticated"; user: UserResponse }).user;

  return (
    <DemoProvider>
      <div className="flex min-h-screen bg-[#09090b]">
        {demo && (
          <div className="fixed inset-x-0 top-0 z-50 flex h-9 items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 text-[12px] font-medium text-amber-300">
            <Eye className="size-3.5" />
            Demo Mode &mdash; Viewing sample data (read-only). Sign in to create and manage resources.
            <Link
              href="/login"
              className="ml-3 rounded-md border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-400 transition hover:bg-amber-500/10"
            >
              Sign in
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-md border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-400 transition hover:bg-amber-500/10"
            >
              Exit Demo
            </button>
          </div>
        )}

        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-white/[0.06] bg-[#0c0c0e] ${demo ? "top-9" : ""}`}>
          <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-5">
            <div className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14.9282 5V11L8 15L1.07179 11V5L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="text-zinc-300" />
                <path d="M8 5L11.4641 7V9L8 11L4.53589 9V7L8 5Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className="text-zinc-300" />
              </svg>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.02em] text-zinc-100">Acheron</span>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 p-3">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={`group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all ${active ? "bg-white/[0.08] text-zinc-50" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"}`}>
                  <Icon className={`size-4 shrink-0 transition-colors ${active ? "text-zinc-300" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                  {label}
                  {active && <ChevronRight className="ml-auto size-3 text-zinc-600" />}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/[0.06] p-3">
            <div className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2">
              <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-zinc-200 ${demo ? "bg-gradient-to-br from-amber-600 to-amber-800" : "bg-gradient-to-br from-zinc-600 to-zinc-800"}`}>
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-zinc-300">{user?.name ?? "User"}</p>
                <p className="truncate text-[11px] capitalize text-zinc-600">{demo ? "demo viewer" : `${user?.tier ?? "free"} plan`}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition-all hover:bg-white/[0.04] hover:text-zinc-400">
              <LogOut className="size-4 shrink-0" />
              {demo ? "Exit Demo" : "Sign out"}
            </button>
          </div>
        </aside>

        <main className={`ml-[220px] flex-1 ${demo ? "mt-9" : ""}`}>{children}</main>
      </div>
    </DemoProvider>
  );
}
