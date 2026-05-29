"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LiquidBg } from "@/components/liquid-bg";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    }
  }, [token, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LiquidBg />
        <div className="relative flex flex-col items-center gap-5">
          {/* Premium spinner */}
          <div className="relative w-12 h-12">
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "rgba(139,92,246,0.15)",
                borderTopColor: "#8b5cf6",
                animationDuration: "1s",
              }}
            />
            <div
              className="absolute inset-1 rounded-full animate-spin"
              style={{
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "transparent",
                borderTopColor: "rgba(6,182,212,0.4)",
                animationDuration: "1.5s",
                animationDirection: "reverse",
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground/60 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <LiquidBg />

      {/* Fixed sidebar */}
      <Sidebar collapsed={!sidebarOpen} />

      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        className="sidebar-toggle"
        style={{
          left: sidebarOpen ? 232 : 8,
        }}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="w-4 h-4" strokeWidth={1.8} />
        ) : (
          <PanelLeftOpen className="w-4 h-4" strokeWidth={1.8} />
        )}
      </button>

      {/* Right column: header + scrollable content */}
      <div
        className="flex flex-col flex-1 min-h-screen transition-[padding-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          paddingLeft: sidebarOpen ? 244 : 0,
        }}
      >
        {/* Sticky top header */}
        <Header />

        {/* Page content — scrollable */}
        <main className="flex-1 relative overflow-y-auto">
          <div className="p-6 lg:p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
