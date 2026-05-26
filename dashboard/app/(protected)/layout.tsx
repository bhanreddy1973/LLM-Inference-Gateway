"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { LiquidBg } from "@/components/liquid-bg";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    }
  }, [token, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LiquidBg />
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(139,92,246,0.3)", borderTopColor: "#8b5cf6" }} />
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
      <LiquidBg />
      <Sidebar />
      <main className="relative pl-60 min-h-screen">
        <div className="p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
