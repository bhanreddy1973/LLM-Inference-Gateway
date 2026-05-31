# LLM Inference Gateway — Project Design Document

> **Implementation status:** Fully built and running. See [`README.md`](./README.md) for quick-start instructions.

## What Was Built (Implementation Summary)

### Backend (FastAPI + gRPC)

| Component | Status | Notes |
|-----------|--------|-------|
| User registration & JWT login | ✅ | `POST /v1/auth/register`, `POST /v1/auth/login` |
| Profile & password update | ✅ | `PATCH /v1/auth/me` |
| API key CRUD | ✅ | `GET/POST /v1/keys`, `PATCH/DELETE /v1/keys/{id}` |
| Per-key custom rate limits | ✅ | `requests_per_minute`, `requests_per_day`, `max_tokens_per_request` columns on `api_keys` |
| Redis sliding-window rate limiter | ✅ | Lua script, key-level limits override tier defaults |
| gRPC inference worker | ✅ | Circuit breaker + exponential backoff |
| Streaming SSE chat | ✅ | `POST /v1/chat/stream`, OpenAI-compatible format |
| ClickHouse async logging | ✅ | Batched inserts, `inference_logs` table + `user_usage_daily` materialized view |
| Analytics API | ✅ | `GET /v1/usage/analytics?days=N` — time-series, model breakdown |
| Request logs API | ✅ | `GET /v1/usage/logs` — paginated, filterable by model/status/days |
| System health probes | ✅ | `GET /v1/health`, `GET /v1/health/ready` |
| Database migrations | ✅ | Alembic: `001_initial_schema`, `002_key_custom_limits` |

### Frontend (Next.js 16 Dashboard)

| Page | Route | Status |
|------|-------|--------|
| Landing page | `/` | ✅ |
| Login | `/login` | ✅ |
| Register | `/register` | ✅ |
| Forgot password | `/forgot-password` | ✅ |
| Overview dashboard | `/dashboard` | ✅ |
| API Keys manager | `/dashboard/keys` | ✅ with custom limit UI |
| Analytics | `/dashboard/usage` | ✅ 4-chart grid |
| Request Logs | `/dashboard/logs` | ✅ filterable, paginated |
| Playground | `/dashboard/playground` | ✅ streaming SSE chat |
| System Status | `/dashboard/status` | ✅ live health + 40-slot history |
| Settings | `/dashboard/settings` | ✅ profile + tier info |

---


## 1. Executive Summary

A self-hostable, production-grade API gateway that sits in front of Anthropic Claude models and provides:
- **Authentication & API key management** (PostgreSQL)
- **Per-key rate limiting** with sliding window (Redis)
- **Request routing** to LLM inference workers (gRPC)
- **Real-time streaming** of token responses (Server-Sent Events)
- **Analytics & logging** at scale (ClickHouse)
- **Usage dashboards** with per-user breakdowns

**Why this exists:** Organizations deploying LLMs need a unified control plane — auth, billing, rate limiting, and observability — between their users and the model API. This gateway solves that.

---

## 2. System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        C1[Web App]
        C2[Mobile App]
        C3[CLI / SDK]
    end

    subgraph "Gateway Layer (FastAPI)"
        GW[API Gateway<br/>FastAPI + Uvicorn]
        AUTH[Auth Middleware]
        RL[Rate Limiter]
        ROUTER[Request Router]
    end

    subgraph "Worker Layer (gRPC)"
        W1[Inference Worker 1]
        W2[Inference Worker 2]
        W3[Inference Worker N]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Users, Keys, Tiers)]
        RD[(Redis<br/>Rate Limits, Cache)]
        CH[(ClickHouse<br/>Request Logs)]
    end

    subgraph "External"
        CLAUDE[Anthropic Claude API]
    end

    C1 & C2 & C3 -->|HTTPS| GW
    GW --> AUTH
    AUTH -->|Validate Key| PG
    AUTH --> RL
    RL -->|Check/Increment| RD
    RL --> ROUTER
    ROUTER -->|gRPC| W1 & W2 & W3
    W1 & W2 & W3 -->|HTTPS| CLAUDE
    GW -->|Async Insert| CH
```

---

## 3. Request Flow — End to End

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as FastAPI Gateway
    participant Redis
    participant Postgres as PostgreSQL
    participant Worker as gRPC Worker
    participant Claude as Anthropic API
    participant ClickHouse

    Client->>Gateway: POST /v1/chat (API-Key header)
    
    %% Auth
    Gateway->>Redis: GET cached_key:{api_key_hash}
    alt Cache Hit
        Redis-->>Gateway: user_id, tier, limits
    else Cache Miss
        Gateway->>Postgres: SELECT * FROM api_keys WHERE key_hash = ?
        Postgres-->>Gateway: user_id, tier, limits
        Gateway->>Redis: SET cached_key:{hash} TTL=300s
    end

    %% Rate Limiting
    Gateway->>Redis: EVALSHA sliding_window.lua (key, window, max_requests)
    Redis-->>Gateway: ALLOWED / DENIED (remaining, reset_at)
    
    alt Rate Limited
        Gateway-->>Client: 429 Too Many Requests + Retry-After
    end

    %% Inference
    Gateway->>Worker: InferenceRequest (gRPC)
    Worker->>Claude: POST /v1/messages
    Claude-->>Worker: Stream tokens
    Worker-->>Gateway: Stream InferenceResponse chunks (gRPC streaming)
    Gateway-->>Client: SSE stream (text/event-stream)

    %% Async Logging
    Gateway--)ClickHouse: INSERT INTO inference_logs (async, batched)
```

---

## 4. Authentication Flow

```mermaid
flowchart TD
    A[Incoming Request] --> B{API-Key Header Present?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D[SHA-256 Hash the Key]
    D --> E{Key in Redis Cache?}
    E -->|Yes| F[Load user_id, tier, limits from cache]
    E -->|No| G[Query PostgreSQL]
    G --> H{Key Exists & Active?}
    H -->|No| I[401 Invalid API Key]
    H -->|Yes| J[Cache in Redis TTL=5min]
    J --> F
    F --> K{Account Suspended?}
    K -->|Yes| L[403 Account Suspended]
    K -->|No| M[Attach user context to request]
    M --> N[Proceed to Rate Limiter]

    style C fill:#f66,color:#fff
    style I fill:#f66,color:#fff
    style L fill:#f66,color:#fff
    style N fill:#6f6,color:#000
```

### Key Design Decisions
- **Keys are stored as SHA-256 hashes** — never plaintext in the database
- **Redis caches validated keys for 5 minutes** — avoids hitting PostgreSQL on every request
- **Prefix-based key format**: `sk-live-<random>` or `sk-test-<random>` for easy identification
- **Key rotation** supported — users can have multiple active keys

---

## 5. Rate Limiting Flow

```mermaid
flowchart TD
    A[Request with user context] --> B[Determine rate limit tier]
    B --> C{Tier}
    C -->|Free| D[10 req/min, 100 req/day]
    C -->|Pro| E[60 req/min, 5000 req/day]
    C -->|Enterprise| F[300 req/min, unlimited/day]
    
    D & E & F --> G[Execute Sliding Window Lua Script]
    G --> H{Within Limit?}
    H -->|Yes| I[Allow Request]
    H -->|No| J[429 + Headers]
    
    I --> K[Add Response Headers]
    K --> L["X-RateLimit-Limit: {max}"]
    K --> M["X-RateLimit-Remaining: {left}"]
    K --> N["X-RateLimit-Reset: {epoch}"]

    style I fill:#6f6,color:#000
    style J fill:#f66,color:#fff
```

### Redis Sliding Window Algorithm

```mermaid
sequenceDiagram
    participant GW as Gateway
    participant Redis

    Note over GW,Redis: Sliding Window Counter (Lua Script)
    
    GW->>Redis: EVALSHA sliding_window_rate_limit
    Note right of Redis: 1. ZREMRANGEBYSCORE key 0 (now - window)
    Note right of Redis: 2. count = ZCARD key
    Note right of Redis: 3. if count < limit: ZADD key now now
    Note right of Redis: 4. EXPIRE key window_seconds
    Redis-->>GW: {allowed: bool, remaining: int, reset_at: epoch}
```

**Why sliding window over fixed window?** Fixed windows have a burst problem at window boundaries (2x burst possible). Sliding window using sorted sets gives precise per-second fairness.

---

## 6. gRPC Worker Flow

```mermaid
sequenceDiagram
    participant GW as FastAPI Gateway
    participant LB as gRPC Load Balancer
    participant W as Inference Worker
    participant Claude as Anthropic API

    GW->>LB: InferenceRequest{model, messages, params}
    LB->>W: Route to available worker
    
    W->>W: Validate & transform request
    W->>Claude: POST /v1/messages (stream=true)
    
    loop For each token chunk
        Claude-->>W: SSE: data: {"type":"content_block_delta"...}
        W-->>GW: gRPC StreamResponse{chunk, token_count, done=false}
    end
    
    Claude-->>W: SSE: data: {"type":"message_stop"}
    W->>W: Calculate final metrics (total_tokens, latency)
    W-->>GW: gRPC StreamResponse{metrics, done=true}
```

### Worker Responsibilities
1. **Request transformation** — normalize to Anthropic API format
2. **Streaming proxy** — read SSE from Claude, emit gRPC stream chunks
3. **Retry logic** — exponential backoff on 429/500 from Anthropic
4. **Circuit breaker** — stop sending if Claude returns repeated 5xx
5. **Metrics collection** — input_tokens, output_tokens, time_to_first_token, total_latency

---

## 7. Streaming (SSE) Flow — Client ↔ Gateway

```mermaid
sequenceDiagram
    participant Client
    participant GW as FastAPI Gateway
    participant Worker as gRPC Worker

    Client->>GW: POST /v1/chat (stream=true)
    GW->>GW: Auth + Rate Limit (synchronous)
    GW->>Worker: gRPC StreamInference()
    
    Note over GW,Client: Connection: keep-alive<br/>Content-Type: text/event-stream

    loop gRPC stream chunks
        Worker-->>GW: StreamResponse{delta: "Hello"}
        GW-->>Client: data: {"choices":[{"delta":{"content":"Hello"}}]}
        Worker-->>GW: StreamResponse{delta: " world"}
        GW-->>Client: data: {"choices":[{"delta":{"content":" world"}}]}
    end

    Worker-->>GW: StreamResponse{done: true, usage: {in: 15, out: 42}}
    GW-->>Client: data: {"choices":[{"finish_reason":"stop"}], "usage":{...}}
    GW-->>Client: data: [DONE]
    
    GW--)GW: Queue log entry for ClickHouse batch insert
```

### SSE Format (OpenAI-compatible)
```
data: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":15,"completion_tokens":42,"total_tokens":57}}

data: [DONE]
```

---

## 8. Logging Pipeline — ClickHouse

```mermaid
flowchart LR
    subgraph "Gateway Process"
        REQ[Request Complete] --> BUF[In-Memory Buffer<br/>asyncio.Queue]
    end

    subgraph "Background Flush Task"
        BUF --> BATCH{Buffer ≥ 100<br/>OR 5s elapsed?}
        BATCH -->|Yes| INSERT[Batch INSERT into ClickHouse]
        BATCH -->|No| WAIT[Wait]
    end

    subgraph "ClickHouse"
        INSERT --> TABLE[(inference_logs<br/>MergeTree<br/>PARTITION BY toYYYYMM)]
    end

    subgraph "Query Layer"
        TABLE --> DASH[/v1/analytics endpoint]
        TABLE --> GRAFANA[Grafana Dashboard]
    end
```

### Why Async Batched Writes?
- ClickHouse performs best with large batch inserts (1000+ rows)
- We buffer in an asyncio Queue and flush every 5 seconds OR when buffer hits 100 entries
- Gateway latency is unaffected — logging is fire-and-forget
- On shutdown, remaining buffer is flushed

---

## 9. Database Schemas

### 9.1 PostgreSQL — Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar tier "free | pro | enterprise"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    API_KEYS {
        uuid id PK
        uuid user_id FK
        varchar key_hash UK "SHA-256 of the actual key"
        varchar key_prefix "First 8 chars for identification"
        varchar name "User-given label"
        boolean is_active
        timestamp created_at
        timestamp expires_at
        timestamp last_used_at
    }

    USAGE_LIMITS {
        uuid id PK
        varchar tier UK "free | pro | enterprise"
        int requests_per_minute
        int requests_per_day
        int max_tokens_per_request
        int max_context_window
    }

    USERS ||--o{ API_KEYS : "has many"
    USERS }o--|| USAGE_LIMITS : "tier maps to"
```

### 9.2 PostgreSQL DDL

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    key_prefix VARCHAR(12) NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'Default Key',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier VARCHAR(20) UNIQUE NOT NULL,
    requests_per_minute INT NOT NULL,
    requests_per_day INT NOT NULL,
    max_tokens_per_request INT NOT NULL DEFAULT 4096,
    max_context_window INT NOT NULL DEFAULT 200000
);

-- Indexes
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_users_email ON users(email);

-- Seed tier limits
INSERT INTO usage_limits (tier, requests_per_minute, requests_per_day, max_tokens_per_request, max_context_window) VALUES
    ('free', 10, 100, 1024, 50000),
    ('pro', 60, 5000, 4096, 200000),
    ('enterprise', 300, -1, 8192, 200000);  -- -1 = unlimited
```

### 9.3 ClickHouse DDL

```sql
CREATE TABLE inference_logs (
    request_id      UUID,
    user_id         UUID,
    api_key_prefix  String,
    model           LowCardinality(String),
    
    -- Request metadata
    input_tokens    UInt32,
    output_tokens   UInt32,
    total_tokens    UInt32,
    max_tokens      UInt32,
    temperature     Float32,
    stream          Bool,
    
    -- Performance
    time_to_first_token_ms  UInt32,
    total_latency_ms        UInt32,
    worker_id               LowCardinality(String),
    
    -- Status
    status_code     UInt16,
    error_type      LowCardinality(Nullable(String)),
    finish_reason   LowCardinality(String),
    
    -- Timestamps
    created_at      DateTime64(3, 'UTC'),
    
    -- Cost tracking
    estimated_cost_usd  Float64
    
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at)
TTL created_at + INTERVAL 90 DAY;

-- Materialized view for real-time per-user stats
CREATE MATERIALIZED VIEW user_usage_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (user_id, day, model)
AS SELECT
    user_id,
    toDate(created_at) AS day,
    model,
    count() AS request_count,
    sum(input_tokens) AS total_input_tokens,
    sum(output_tokens) AS total_output_tokens,
    sum(estimated_cost_usd) AS total_cost,
    avg(total_latency_ms) AS avg_latency_ms,
    quantile(0.95)(total_latency_ms) AS p95_latency_ms
FROM inference_logs
GROUP BY user_id, day, model;
```

---

## 10. API Specification

### Base URL: `http://localhost:8000/v1`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Register new user | None |
| `POST` | `/auth/login` | Get JWT token | None |
| `GET` | `/auth/me` | Get current user + tier | JWT |
| `PATCH` | `/auth/me` | Update name or password | JWT |
| `POST` | `/keys` | Create API key (with optional per-key limits) | JWT |
| `GET` | `/keys` | List all API keys | JWT |
| `PATCH` | `/keys/{key_id}` | Update key name / rate limits | JWT |
| `DELETE` | `/keys/{key_id}` | Revoke an API key | JWT |
| `POST` | `/chat` | Chat completion (non-streaming) | API Key |
| `POST` | `/chat/stream` | Chat completion (SSE streaming) | API Key |
| `GET` | `/models` | List available models | API Key |
| `GET` | `/usage/analytics` | Time-series analytics (ClickHouse) | JWT |
| `GET` | `/usage/logs` | Paginated request logs with filters | JWT |
| `GET` | `/health` | Liveness probe | None |
| `GET` | `/health/ready` | Readiness probe (checks all deps) | None |

### Request/Response Examples

#### POST /v1/chat
```json
// Request
{
  "model": "claude-sonnet-4-20250514",
  "messages": [
    {"role": "user", "content": "Explain quantum computing in one sentence."}
  ],
  "max_tokens": 256,
  "temperature": 0.7,
  "stream": false
}

// Response (200 OK)
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1716700000,
  "model": "claude-sonnet-4-20250514",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum computing uses quantum mechanical phenomena..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 24,
    "total_tokens": 36
  }
}
```

#### POST /v1/chat/stream
```
// Response (200 OK, Content-Type: text/event-stream)
data: {"id":"chatcmpl-abc123","choices":[{"delta":{"role":"assistant"},"index":0}]}

data: {"id":"chatcmpl-abc123","choices":[{"delta":{"content":"Quantum"},"index":0}]}

data: {"id":"chatcmpl-abc123","choices":[{"delta":{"content":" computing"},"index":0}]}

data: [DONE]
```

#### Error Responses
```json
// 429 Too Many Requests
{
  "error": {
    "type": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 12 seconds.",
    "retry_after": 12
  }
}

// 401 Unauthorized
{
  "error": {
    "type": "invalid_api_key",
    "message": "The API key provided is invalid or has been revoked."
  }
}
```

---

## 11. gRPC Proto Definition

```protobuf
syntax = "proto3";

package inference;

option go_package = "github.com/bhanreddy1973/llm-inference-gateway/proto";

// Service definition
service InferenceService {
    // Unary — full response at once
    rpc Infer(InferenceRequest) returns (InferenceResponse);
    
    // Server streaming — token by token
    rpc StreamInfer(InferenceRequest) returns (stream StreamChunk);
    
    // Health check
    rpc HealthCheck(Empty) returns (HealthResponse);
}

// Messages
message Empty {}

message Message {
    string role = 1;       // "user", "assistant", "system"
    string content = 2;
}

message InferenceRequest {
    string request_id = 1;
    string model = 2;
    repeated Message messages = 3;
    int32 max_tokens = 4;
    float temperature = 5;
    float top_p = 6;
    repeated string stop_sequences = 7;
}

message InferenceResponse {
    string request_id = 1;
    string content = 2;
    string finish_reason = 3;
    UsageMetrics usage = 4;
    PerformanceMetrics performance = 5;
}

message StreamChunk {
    string request_id = 1;
    oneof payload {
        string delta = 2;           // Text token
        UsageMetrics usage = 3;     // Final usage (last chunk)
    }
    bool done = 4;
    string finish_reason = 5;
    PerformanceMetrics performance = 6;
}

message UsageMetrics {
    int32 input_tokens = 1;
    int32 output_tokens = 2;
    int32 total_tokens = 3;
}

message PerformanceMetrics {
    int32 time_to_first_token_ms = 1;
    int32 total_latency_ms = 2;
    string worker_id = 3;
}

message HealthResponse {
    bool healthy = 1;
    string version = 2;
    int32 active_connections = 3;
}
```

---

## 12. Directory Structure

```
llm-inference-gateway/
├── PROJECT_DESIGN.md              # This file
├── README.md                      # Quick start + architecture overview
├── podman-compose.yml             # All services orchestrated
├── .env.example                   # Environment variables template
├── .gitignore
│
├── proto/
│   └── inference.proto            # gRPC service definition
│
├── gateway/                       # FastAPI application
│   ├── Containerfile              # (Podman uses Containerfile, not Dockerfile)
│   ├── requirements.txt
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Settings (pydantic-settings)
│   ├── dependencies.py            # Dependency injection
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py                # /auth/register, /auth/login
│   │   ├── keys.py                # /keys CRUD
│   │   ├── chat.py                # /chat, /chat/stream
│   │   ├── usage.py               # /usage, /usage/analytics
│   │   └── health.py              # /health, /health/ready
│   │
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth.py                # API key validation middleware
│   │   ├── rate_limiter.py        # Redis sliding window
│   │   └── request_logger.py      # ClickHouse async logger
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── user_service.py        # User CRUD
│   │   ├── key_service.py         # API key generation/validation
│   │   ├── inference_client.py    # gRPC client to worker
│   │   └── analytics_service.py   # ClickHouse queries
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py            # SQLAlchemy models
│   │   └── schemas.py             # Pydantic request/response schemas
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── hashing.py             # SHA-256, bcrypt helpers
│   │   └── key_generator.py       # API key generation (sk-live-xxx)
│   │
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_rate_limiter.py
│       ├── test_chat.py
│       └── test_analytics.py
│
├── worker/                        # gRPC inference worker
│   ├── Containerfile
│   ├── requirements.txt
│   ├── main.py                    # gRPC server entry point
│   ├── config.py
│   ├── inference_handler.py       # Anthropic API client + streaming
│   ├── circuit_breaker.py         # Circuit breaker pattern
│   ├── retry.py                   # Exponential backoff logic
│   └── tests/
│       ├── test_inference.py
│       └── test_circuit_breaker.py
│
├── migrations/                    # Alembic database migrations
│   ├── alembic.ini
│   ├── env.py
│   └── versions/
│       ├── 001_initial_schema.py  # Users, api_keys, indexes
│       └── 002_key_custom_limits.py # Per-key RPM/RPD/max-token columns
│
├── scripts/
│   ├── init_clickhouse.sql        # ClickHouse table + materialized view
│   ├── seed_data.py               # Seed 3 test users (free/pro/enterprise)
│   └── clickhouse-config/
│       └── default-user.xml       # Allow ClickHouse connections from containers
│
└── frontend/                      # Next.js 16 dashboard (port 3000)
    ├── Containerfile
    ├── app/
    │   ├── (marketing)/           # Public landing page (own layout)
    │   ├── login/                 # Sign in
    │   ├── register/              # Create account
    │   ├── forgot-password/       # Password reset
    │   └── dashboard/             # Protected area (auth guard in layout.tsx)
    │       ├── layout.tsx         # Sidebar + getMe() auth guard
    │       ├── page.tsx           # Overview
    │       ├── keys/              # API key management
    │       ├── usage/             # Analytics charts
    │       ├── logs/              # Request log inspector
    │       ├── playground/        # Streaming chat UI
    │       ├── status/            # System health
    │       └── settings/          # Account + tier
    └── lib/
        └── api.ts                 # All typed fetch wrappers + ApiError class
```

---

## 13. Requirements & Dependencies

### 13.1 System Requirements

| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Gateway + Worker |
| Podman | 4.0+ | Container runtime |
| Podman Compose | 1.0+ | Multi-container orchestration |
| PostgreSQL | 16 | User/key storage |
| Redis | 7.2+ | Rate limiting + caching |
| ClickHouse | 24.x | Analytics logging |

### 13.2 Gateway Dependencies (`gateway/requirements.txt`)

```
# Web framework
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.9.0
pydantic-settings==2.5.0

# Database
sqlalchemy[asyncio]==2.0.32
asyncpg==0.29.0
alembic==1.13.0

# Redis
redis[hiredis]==5.1.0

# gRPC client
grpcio==1.66.0
grpcio-tools==1.66.0
protobuf==5.28.0

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# ClickHouse
clickhouse-connect==0.7.19

# Utilities
httpx==0.27.0
python-multipart==0.0.9

# Testing
pytest==8.3.0
pytest-asyncio==0.24.0
httpx==0.27.0
```

### 13.3 Worker Dependencies (`worker/requirements.txt`)

```
# gRPC server
grpcio==1.66.0
grpcio-tools==1.66.0
protobuf==5.28.0

# Anthropic SDK
anthropic==0.34.0

# Config
pydantic-settings==2.5.0

# Observability
prometheus-client==0.21.0

# Testing
pytest==8.3.0
pytest-asyncio==0.24.0
```

### 13.4 Podman Compose

```yaml
# podman-compose.yml
version: "3.9"

services:
  gateway:
    build:
      context: ./gateway
      dockerfile: Containerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://gateway:gateway@postgres:5432/inference_gw
      - REDIS_URL=redis://redis:6379/0
      - CLICKHOUSE_HOST=clickhouse
      - CLICKHOUSE_PORT=8123
      - GRPC_WORKER_HOST=worker
      - GRPC_WORKER_PORT=50051
      - JWT_SECRET=change-me-in-production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      clickhouse:
        condition: service_healthy
      worker:
        condition: service_started

  worker:
    build:
      context: ./worker
      dockerfile: Containerfile
    ports:
      - "50051:50051"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GRPC_PORT=50051
      - WORKER_ID=worker-1

  postgres:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_DB: inference_gw
      POSTGRES_USER: gateway
      POSTGRES_PASSWORD: gateway
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gateway"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: docker.io/library/redis:7.2-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  clickhouse:
    image: docker.io/clickhouse/clickhouse-server:24.8
    ports:
      - "8123:8123"   # HTTP
      - "9000:9000"   # Native
    volumes:
      - ch_data:/var/lib/clickhouse
      - ./scripts/init_clickhouse.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "clickhouse-client", "--query", "SELECT 1"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pg_data:
  ch_data:
```

---

## 14. Execution Plan

### Phase 1 — Foundation (Days 1-3)
> Goal: Basic FastAPI app + PostgreSQL + Auth working

```mermaid
gantt
    title Execution Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b

    section Phase 1 - Foundation
    Project scaffold + Podman Compose       :p1a, 2026-05-26, 1d
    PostgreSQL schema + Alembic migrations  :p1b, after p1a, 1d
    Auth (register/login/JWT) + API keys    :p1c, after p1b, 1d

    section Phase 2 - Core
    Redis rate limiter (sliding window)     :p2a, after p1c, 1d
    gRPC worker + Anthropic streaming       :p2b, after p1c, 2d
    Gateway ↔ Worker integration            :p2c, after p2b, 1d

    section Phase 3 - Analytics
    ClickHouse logging (async batch)        :p3a, after p2c, 1d
    /usage + /analytics endpoints           :p3b, after p3a, 1d
    Materialized views + dashboards         :p3c, after p3b, 1d

    section Phase 4 - Polish
    Tests (unit + integration)              :p4a, after p3c, 2d
    README + docs + load testing            :p4b, after p4a, 1d
    Record demo video / GIF                 :p4c, after p4b, 1d
```

---

### Phase 1 — Foundation (Days 1-3)

| Task | Deliverable |
|------|-------------|
| Scaffold project structure | All directories, `Containerfile`s, `podman-compose.yml` |
| PostgreSQL + Alembic | DB models, migration scripts, seed data |
| User registration + login | `/auth/register`, `/auth/login` → JWT token |
| API key management | `/keys` CRUD — generate `sk-live-*` keys, store SHA-256 hash |
| Key validation middleware | Middleware that validates API-Key header against Postgres (+ Redis cache) |

**Exit criteria:** Can register user, create API key, make authenticated request.

---

### Phase 2 — Core Engine (Days 4-7)

| Task | Deliverable |
|------|-------------|
| Redis rate limiter | Lua script for sliding window, middleware integration |
| gRPC proto compilation | Generated Python stubs from `inference.proto` |
| Inference worker | gRPC server that calls Anthropic, supports streaming |
| Gateway ↔ Worker | FastAPI calls worker via gRPC, returns response |
| SSE streaming | `/chat/stream` endpoint with `text/event-stream` |

**Exit criteria:** Full request cycle works — auth → rate limit → gRPC → Claude → stream back.

---

### Phase 3 — Analytics (Days 8-10)

| Task | Deliverable |
|------|-------------|
| ClickHouse async logger | Background task batching logs, flushing every 5s |
| Inference logging | Every request logged with tokens, latency, status |
| `/usage` endpoint | Per-key usage stats (today, this week, this month) |
| `/analytics` endpoint | Time-series data, model breakdown, p95 latency |
| Materialized views | `user_usage_daily` auto-aggregated |

**Exit criteria:** After 100 requests, `/analytics` shows accurate stats.

---

### Phase 4 — Polish (Days 11-14)

| Task | Deliverable |
|------|-------------|
| Unit tests | Auth, rate limiter, key generation — 80%+ coverage |
| Integration tests | Full flow with test containers |
| Load testing | Locust script, test with 50 concurrent users |
| README.md | Architecture diagram, quick start, screenshots |
| Demo | GIF/video showing the full flow |
| GitHub | Clean commits, issues, project board |

**Exit criteria:** `podman compose up` → fully working system in <60 seconds.

---

## 15. Testing Strategy

### 15.1 Unit Tests

```mermaid
flowchart LR
    subgraph "Unit Tests (pytest)"
        A[test_auth.py<br/>JWT, password hashing]
        B[test_rate_limiter.py<br/>Sliding window logic]
        C[test_key_generator.py<br/>Key format, hashing]
        D[test_circuit_breaker.py<br/>State transitions]
    end

    A & B & C & D --> MOCK[Mocked Redis/Postgres/gRPC]
```

### 15.2 Integration Tests

```mermaid
flowchart LR
    subgraph "Integration Tests (pytest + testcontainers)"
        E[test_full_flow.py<br/>Register → Key → Chat → Logs]
        F[test_rate_limiting.py<br/>Burst 100 req, verify 429]
        G[test_streaming.py<br/>SSE parsing, token-by-token]
    end

    E & F & G --> REAL[Real Postgres + Redis + ClickHouse<br/>via Podman testcontainers]
```

### 15.3 Load Tests (Locust)

| Scenario | Config | Pass Criteria |
|----------|--------|---------------|
| Sustained load | 50 users, 10 req/s, 5 min | p95 < 200ms (excl. LLM time) |
| Burst test | 200 users, 100 req/s, 30s | Rate limiter triggers, no crashes |
| Long-running | 10 users, 1 req/s, 1 hour | No memory leaks, stable latency |

---

## 16. Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Separation of concerns** | Gateway handles auth/routing; Workers handle inference |
| **Horizontal scalability** | Add more workers via Podman replicas |
| **Fail gracefully** | Circuit breaker on worker; retry with backoff |
| **Observe everything** | Every request logged; latency tracked end-to-end |
| **Security first** | Keys hashed at rest; JWT short-lived; rate limits enforced |
| **OpenAI-compatible API** | Easy migration for users coming from OpenAI |

---

## 17. What This Demonstrates to Sarvam

| Sarvam Requirement | How This Project Proves It |
|--------------------|---------------------------|
| FastAPI at scale | Full production API with middleware, DI, async |
| gRPC | Custom proto, server streaming, load balancing |
| PostgreSQL | Schema design, migrations, indexed queries |
| Redis | Lua scripting, sliding window, caching layer |
| ClickHouse | Partitioned analytics, materialized views |
| Low-latency systems | Async everywhere, streaming, connection pooling |
| ML inference serving | Streaming LLM proxy with metrics |
| Auth & security | API keys (hashed), JWT, rate limiting |
| Observability | ClickHouse analytics, structured logging |
| Docker/Podman + Compose | One-command multi-service orchestration |
