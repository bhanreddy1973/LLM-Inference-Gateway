// Auth
export interface LoginRequest { email: string; password: string }
export interface RegisterRequest { email: string; password: string; name: string }
export interface TokenResponse { access_token: string; token_type: string }
export interface UserProfile {
  id: string
  email: string
  name: string
  tier: "free" | "pro" | "enterprise"
  is_active: boolean
  created_at: string
  limits?: { requests_per_minute: number; requests_per_day: number; max_tokens_per_request: number }
}

// API Keys
export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  created_at: string
  expires_at: string | null
  last_used_at: string | null
}
export interface ApiKeyCreateResponse { id: string; key: string; name: string; key_prefix: string; created_at: string }

// Usage / Analytics
export interface UsageSummary {
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
  period_days: number
}

export interface DailyBreakdown {
  day: string
  requests: number
  total_tokens: number
  cost_usd: number
  avg_latency_ms: number
}

export interface ModelBreakdown {
  model: string
  requests: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

export interface RecentRequest {
  request_id: string
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  total_latency_ms: number
  time_to_first_token_ms: number
  status_code: number
  finish_reason: string
  created_at: string
  estimated_cost_usd: number
}

export interface AnalyticsResponse {
  summary: UsageSummary
  daily_breakdown: DailyBreakdown[]
  by_model: ModelBreakdown[]
  recent_requests: RecentRequest[]
}

// Health
export interface ServiceHealth { status: "healthy" | "degraded" | "unhealthy"; [key: string]: unknown }
export interface HealthStatus {
  gateway: ServiceHealth & { uptime_seconds?: number }
  postgres: ServiceHealth
  redis: ServiceHealth & { used_memory_mb?: number }
  worker: ServiceHealth & { circuit_breaker?: string; active_connections?: number }
  clickhouse: ServiceHealth
}

// Realtime
export interface RealtimeStats {
  requests: RecentRequest[]
  throughput_1m: number
  throughput_5m: number
  error_rate_1h: number
}

export interface HourlyBreakdown {
  hour: string
  requests: number
  avg_latency_ms: number
  error_count: number
}
