"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { AuthContext, saveAuth, clearAuth, loadAuth } from "@/lib/auth";
import type { UserProfile } from "@/types/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { token: t, user: u } = loadAuth();
    setToken(t);
    setUser(u);
    setIsLoading(false);
  }, []);

  const login = useCallback((t: string, u: UserProfile) => {
    saveAuth(t, u);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
