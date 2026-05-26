import type {
  LoginRequest, RegisterRequest, TokenResponse, UserProfile,
  ApiKey, ApiKeyCreateResponse, UsageSummary, AnalyticsResponse,
  HealthStatus, RealtimeStats, HourlyBreakdown,
} from "@/types/api";
import { TOKEN_KEY } from "./auth";

const BASE = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  useToken = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (useToken && typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}/v1${path}`, { ...options, headers });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.detail || j.message || msg; } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }

  return res.json();
}

// Auth
export const authApi = {
  login: (body: LoginRequest) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body: RegisterRequest) =>
    request<UserProfile>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<UserProfile>("/auth/me", {}, true),
};

// Keys
export const keysApi = {
  list: () => request<ApiKey[]>("/keys", {}, true),
  create: (name: string) =>
    request<ApiKeyCreateResponse>("/keys", { method: "POST", body: JSON.stringify({ name }) }, true),
  revoke: (id: string) =>
    request<{ message: string }>(`/keys/${id}`, { method: "DELETE" }, true),
};

// Usage
export const usageApi = {
  summary: () => request<UsageSummary>("/usage", {}, true),
  analytics: (days = 30) => request<AnalyticsResponse>(`/usage/analytics?days=${days}`, {}, true),
  realtime: () => request<RealtimeStats>("/usage/realtime", {}, true),
  hourly: () => request<HourlyBreakdown[]>("/usage/hourly", {}, true),
};

// Health
export const healthApi = {
  status: () => request<HealthStatus>("/health/status"),
  ready: () => request<{ status: string }>("/health/ready"),
};

export { ApiError };
