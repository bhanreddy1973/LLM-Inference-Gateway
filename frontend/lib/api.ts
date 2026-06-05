/**
 * Shared API client for the LLM Inference Gateway backend.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Error class ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(res.status, body.detail || "Request failed");
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export function saveToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function removeToken() {
  localStorage.removeItem("access_token");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  tier: string;
  is_active: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  requests_per_minute: number | null;
  requests_per_day: number | null;
  max_tokens_per_request: number | null;
}

export interface ApiKeyCreated extends ApiKey {
  key: string; // full key — shown only once
}

export interface UsageSummary {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  period_days: number;
}

export interface DailyUsage {
  day: string;
  requests: number;
  total_tokens: number;
  cost_usd: number;
  avg_latency_ms: number;
}

export interface ModelUsage {
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface RecentRequest {
  request_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_latency_ms: number;
  status_code: number;
  finish_reason: string;
  created_at: string;
}

export interface AnalyticsResponse {
  summary: UsageSummary;
  daily: DailyUsage[];
  by_model: ModelUsage[];
  recent_requests: RecentRequest[];
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return request<LoginResponse>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<UserResponse> {
  return request<UserResponse>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function getMe(): Promise<UserResponse> {
  return request<UserResponse>("/v1/auth/me");
}

export async function updateMe(patch: { name?: string; current_password?: string; new_password?: string }): Promise<UserResponse> {
  return request<UserResponse>("/v1/auth/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// ─── OAuth API ────────────────────────────────────────────────────────────────

export interface OAuthUrlResponse {
  url: string;
}

export async function getGoogleOAuthUrl(): Promise<OAuthUrlResponse> {
  return request<OAuthUrlResponse>("/v1/auth/oauth/google/url");
}

export async function getGitHubOAuthUrl(): Promise<OAuthUrlResponse> {
  return request<OAuthUrlResponse>("/v1/auth/oauth/github/url");
}

export async function exchangeOAuthCode(
  provider: "google" | "github",
  code: string,
  redirectUri: string,
): Promise<LoginResponse> {
  return request<LoginResponse>(`/v1/auth/oauth/${provider}/callback`, {
    method: "POST",
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
}

// ─── Password Reset API ──────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return request<{ message: string }>("/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>("/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

// ─── System Health ───────────────────────────────────────────────────────────────────

export interface ServiceCheck {
  status: "healthy" | "unhealthy";
  error?: string;
  version?: string;
  active_connections?: number;
}

export interface ReadinessResponse {
  status: "ready" | "not_ready";
  checks: {
    postgres: ServiceCheck;
    redis: ServiceCheck;
    worker: ServiceCheck;
  };
}

export async function getReadiness(): Promise<ReadinessResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/health/ready`);
  return res.json();
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export async function listApiKeys(): Promise<ApiKey[]> {
  return request<ApiKey[]>("/v1/keys");
}

export async function createApiKey(
  name: string,
  limits?: { requests_per_minute?: number; requests_per_day?: number; max_tokens_per_request?: number }
): Promise<ApiKeyCreated> {
  return request<ApiKeyCreated>("/v1/keys", {
    method: "POST",
    body: JSON.stringify({ name, ...limits }),
  });
}

export async function updateApiKey(
  id: string,
  patch: { name?: string; requests_per_minute?: number | null; requests_per_day?: number | null; max_tokens_per_request?: number | null }
): Promise<ApiKey> {
  return request<ApiKey>(`/v1/keys/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  return request<void>(`/v1/keys/${id}`, { method: "DELETE" });
}

// ─── Usage & Analytics ────────────────────────────────────────────────────────

export async function getUsageSummary(days = 30): Promise<UsageSummary> {
  return request<UsageSummary>(`/v1/usage?days=${days}`);
}

export async function getAnalytics(days = 30): Promise<AnalyticsResponse> {
  return request<AnalyticsResponse>(`/v1/usage/analytics?days=${days}`);
}

export interface LogEntry {
  request_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  total_latency_ms: number;
  time_to_first_token_ms: number;
  status_code: number;
  finish_reason: string;
  stream: boolean;
  temperature: number;
  estimated_cost_usd: number;
  api_key_prefix: string;
  created_at: string;
}

export interface LogsResponse {
  items: LogEntry[];
  total: number;
  page: number;
  page_size: number;
}

export async function getLogs(params: {
  page?: number;
  page_size?: number;
  model?: string;
  status_code?: number;
  days?: number;
}): Promise<LogsResponse> {
  const q = new URLSearchParams();
  if (params.page)        q.set("page",        String(params.page));
  if (params.page_size)   q.set("page_size",   String(params.page_size));
  if (params.model)       q.set("model",       params.model);
  if (params.status_code) q.set("status_code", String(params.status_code));
  if (params.days)        q.set("days",        String(params.days));
  return request<LogsResponse>(`/v1/usage/logs?${q.toString()}`);
}

// ─── Chat (uses X-API-Key, not Bearer JWT) ──────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: { message: ChatMessage; finish_reason: string }[];
  usage: ChatUsage;
}

export async function sendChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens = 1024,
  temperature = 0.7,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(res.status, body.detail || "Request failed");
  }
  return res.json();
}

export async function streamChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens = 1024,
  temperature = 0.7,
  onDelta: (text: string) => void,
  onDone: (usage: ChatUsage | null) => void,
  onError: (msg: string) => void,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/v1/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
    });
  } catch {
    onError("Cannot connect to the backend.");
    return;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    onError(body.detail || `Error ${res.status}`);
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) { onError("No response body."); return; }
  const decoder = new TextDecoder();
  let usage: ChatUsage | null = null;
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") { onDone(usage); return; }
      try {
        const json = JSON.parse(payload);
        if (json.error) { onError(json.error.message); return; }
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
        if (json.usage) usage = json.usage;
      } catch { /* ignore parse errors */ }
    }
  }
  onDone(usage);
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function getHealth() {
  return request<{ status: string; service: string; version: string }>(
    "/v1/health",
  );
}
