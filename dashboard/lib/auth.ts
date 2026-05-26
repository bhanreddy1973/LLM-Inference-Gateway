"use client";

import { createContext, useContext } from "react";
import type { UserProfile } from "@/types/api";

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const TOKEN_KEY = "gw_token";
export const USER_KEY = "gw_user";

export function saveAuth(token: string, user: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function loadAuth(): { token: string | null; user: UserProfile | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  let user: UserProfile | null = null;
  try { if (raw) user = JSON.parse(raw); } catch { /* ignore */ }
  return { token, user };
}
