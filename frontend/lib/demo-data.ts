/**
 * Sample data shown in demo mode.
 * Gives viewers a realistic picture of the dashboard without needing a running backend.
 */

import type { AnalyticsResponse, ApiKey, UserResponse, LogEntry } from "./api";

export const DEMO_USER: UserResponse = {
  id: "d3m0-u53r-0000-0000-000000000001",
  email: "demo@acheron.dev",
  name: "Demo Viewer",
  tier: "pro",
  is_active: true,
  created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

export const DEMO_KEYS: ApiKey[] = [
  {
    id: "key-0001-demo",
    key_prefix: "sk-live-Xk9",
    name: "Production API",
    is_active: true,
    created_at: daysAgo(25),
    last_used_at: daysAgo(0),
    requests_per_minute: 60,
    requests_per_day: 5000,
    max_tokens_per_request: 4096,
  },
  {
    id: "key-0002-demo",
    key_prefix: "sk-live-Mn4",
    name: "Staging",
    is_active: true,
    created_at: daysAgo(18),
    last_used_at: daysAgo(1),
    requests_per_minute: null,
    requests_per_day: null,
    max_tokens_per_request: null,
  },
  {
    id: "key-0003-demo",
    key_prefix: "sk-live-Rp7",
    name: "CI Pipeline",
    is_active: false,
    created_at: daysAgo(40),
    last_used_at: daysAgo(12),
    requests_per_minute: 10,
    requests_per_day: 100,
    max_tokens_per_request: 1024,
  },
];

function generateDaily(): AnalyticsResponse["daily"] {
  return Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * 86_400_000).toISOString().split("T")[0];
    const requests = Math.floor(40 + Math.random() * 160);
    const tokens = requests * (200 + Math.floor(Math.random() * 400));
    return {
      day,
      requests,
      total_tokens: tokens,
      cost_usd: +(tokens * 0.000003).toFixed(4),
      avg_latency_ms: Math.floor(180 + Math.random() * 220),
    };
  });
}

const daily = generateDaily();
const totalRequests = daily.reduce((a, d) => a + d.requests, 0);
const totalTokens = daily.reduce((a, d) => a + d.total_tokens, 0);

export const DEMO_ANALYTICS: AnalyticsResponse = {
  summary: {
    total_requests: totalRequests,
    total_input_tokens: Math.floor(totalTokens * 0.4),
    total_output_tokens: Math.floor(totalTokens * 0.6),
    total_cost_usd: +(totalTokens * 0.000003).toFixed(4),
    period_days: 30,
  },
  daily,
  by_model: [
    { model: "claude-sonnet-4-20250514", requests: Math.floor(totalRequests * 0.6), input_tokens: Math.floor(totalTokens * 0.24), output_tokens: Math.floor(totalTokens * 0.36), cost_usd: +(totalTokens * 0.6 * 0.000003).toFixed(4) },
    { model: "claude-haiku-3-20250101", requests: Math.floor(totalRequests * 0.3), input_tokens: Math.floor(totalTokens * 0.12), output_tokens: Math.floor(totalTokens * 0.18), cost_usd: +(totalTokens * 0.3 * 0.000003).toFixed(4) },
    { model: "deepseek-chat", requests: Math.floor(totalRequests * 0.1), input_tokens: Math.floor(totalTokens * 0.04), output_tokens: Math.floor(totalTokens * 0.06), cost_usd: +(totalTokens * 0.1 * 0.000001).toFixed(4) },
  ],
  recent_requests: Array.from({ length: 10 }, (_, i) => ({
    request_id: `req_demo_${String(i + 1).padStart(4, "0")}_${Math.random().toString(36).slice(2, 10)}`,
    model: ["claude-sonnet-4-20250514", "claude-haiku-3-20250101", "deepseek-chat"][i % 3],
    input_tokens: 100 + Math.floor(Math.random() * 500),
    output_tokens: 200 + Math.floor(Math.random() * 800),
    total_latency_ms: 150 + Math.floor(Math.random() * 300),
    status_code: i === 4 ? 429 : 200,
    finish_reason: "end_turn",
    created_at: new Date(Date.now() - i * 300_000).toISOString(),
  })),
};

export const DEMO_LOGS: LogEntry[] = Array.from({ length: 25 }, (_, i) => ({
  request_id: `req_demo_log_${String(i + 1).padStart(4, "0")}`,
  model: ["claude-sonnet-4-20250514", "claude-haiku-3-20250101", "deepseek-chat"][i % 3],
  input_tokens: 80 + Math.floor(Math.random() * 600),
  output_tokens: 150 + Math.floor(Math.random() * 1000),
  total_tokens: 0, // computed below
  total_latency_ms: 120 + Math.floor(Math.random() * 400),
  time_to_first_token_ms: 40 + Math.floor(Math.random() * 100),
  status_code: i === 7 ? 429 : i === 15 ? 502 : 200,
  finish_reason: "end_turn",
  stream: i % 2 === 0,
  temperature: [0.7, 0.5, 1.0][i % 3],
  estimated_cost_usd: +(Math.random() * 0.005).toFixed(5),
  api_key_prefix: DEMO_KEYS[i % 2].key_prefix,
  created_at: new Date(Date.now() - i * 600_000).toISOString(),
})).map((l) => ({ ...l, total_tokens: l.input_tokens + l.output_tokens }));
