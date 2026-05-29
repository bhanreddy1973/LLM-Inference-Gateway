# LLM Inference Gateway

A self-hostable, production-grade API gateway for Anthropic Claude models. Provides authentication, rate limiting, streaming inference, and analytics in a single deployable stack.

## Overview

Organizations deploying LLMs internally need a unified control plane between their users and the model API — handling auth, billing, rate limiting, and observability in one place. This gateway solves that problem.

The LLM Inference Gateway acts as a reverse proxy that sits in front of Anthropic's Claude API and provides:

- **Multi-tenant access control** — Register users, issue API keys, and enforce per-tier usage limits without touching the underlying model provider.
- **Cost visibility** — Track token usage, estimated costs, and latency per user, per model, per day with real-time analytics powered by ClickHouse.
- **OpenAI-compatible API format** — Drop-in replacement for applications already using the OpenAI chat completions format, making migration seamless.
- **Scalable inference layer** — The gateway delegates actual model calls to gRPC workers that can be horizontally scaled. Workers include circuit breakers and retry logic to handle upstream failures gracefully.
- **Streaming-first design** — Server-Sent Events (SSE) deliver tokens to clients in real-time as they're generated, minimizing perceived latency.
- **One-command deployment** — The entire stack (gateway, worker, PostgreSQL, Redis, ClickHouse) launches with a single `podman compose up --build` command.

### Who is this for?

- Teams that want to share a single Anthropic API key across multiple developers while maintaining per-user rate limits and usage tracking.
- Platform engineers building internal LLM services who need auth, observability, and cost attribution out of the box.
- Developers looking for a reference implementation of a production-grade Python microservices architecture using FastAPI, gRPC, Redis, PostgreSQL, and ClickHouse.

## Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        C1[Web App]
        C2[Mobile App]
        C3[CLI / SDK]
    end

    subgraph "Gateway Layer — FastAPI"
        GW[API Gateway<br/>FastAPI + Uvicorn]
        AUTH[Auth Middleware<br/>API Key / JWT]
        RL[Rate Limiter<br/>Sliding Window]
        ROUTER[Request Router]
    end

    subgraph "Worker Layer — gRPC"
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
    AUTH -->|Cache Lookup| RD
    AUTH --> RL
    RL -->|Check/Increment| RD
    RL --> ROUTER
    ROUTER -->|gRPC| W1 & W2 & W3
    W1 & W2 & W3 -->|HTTPS| CLAUDE
    GW -->|Async Batch Insert| CH
```

### Request Flow

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

    Gateway->>Redis: GET cached_key:{api_key_hash}
    alt Cache Hit
        Redis-->>Gateway: user_id, tier, limits
    else Cache Miss
        Gateway->>Postgres: SELECT FROM api_keys WHERE key_hash = ?
        Postgres-->>Gateway: user_id, tier, limits
        Gateway->>Redis: SET cached_key:{hash} TTL=300s
    end

    Gateway->>Redis: EVALSHA sliding_window.lua
    Redis-->>Gateway: ALLOWED / DENIED

    alt Rate Limited
        Gateway-->>Client: 429 Too Many Requests
    end

    Gateway->>Worker: InferenceRequest (gRPC)
    Worker->>Claude: POST /v1/messages (stream=true)
    Claude-->>Worker: Stream tokens
    Worker-->>Gateway: Stream gRPC chunks
    Gateway-->>Client: SSE text/event-stream

    Gateway--)ClickHouse: Async batch insert log
```

### Authentication Flow

```mermaid
flowchart TD
    A[Incoming Request] --> B{API-Key Header?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D[SHA-256 Hash the Key]
    D --> E{Key in Redis Cache?}
    E -->|Yes| F[Load user context from cache]
    E -->|No| G[Query PostgreSQL]
    G --> H{Key Exists & Active?}
    H -->|No| I[401 Invalid API Key]
    H -->|Yes| J[Cache in Redis — TTL 5min]
    J --> F
    F --> K{Account Active?}
    K -->|No| L[403 Suspended]
    K -->|Yes| M[Proceed to Rate Limiter]

    style C fill:#f66,color:#fff
    style I fill:#f66,color:#fff
    style L fill:#f66,color:#fff
    style M fill:#6f6,color:#000
```

### Rate Limiting — Sliding Window

```mermaid
flowchart TD
    A[Request with user context] --> B[Determine tier]
    B --> C{Tier}
    C -->|Free| D[10 req/min, 100 req/day]
    C -->|Pro| E[60 req/min, 5000 req/day]
    C -->|Enterprise| F[300 req/min, unlimited/day]

    D & E & F --> G[Execute Sliding Window Lua Script]
    G --> H{Within Limit?}
    H -->|Yes| I[Allow — set rate limit headers]
    H -->|No| J[429 + Retry-After header]

    style I fill:#6f6,color:#000
    style J fill:#f66,color:#fff
```

## Features

- **API Key Authentication** — SHA-256 hashed keys with Redis cache (5min TTL)
- **Per-Tier Rate Limiting** — Redis sliding window (sorted sets + Lua script)
- **Streaming Inference** — SSE (Server-Sent Events), OpenAI-compatible format
- **gRPC Workers** — Scalable inference layer with circuit breaker + retry
- **Analytics** — Async batched logging to ClickHouse, materialized views
- **Usage Dashboards** — Per-user breakdowns (tokens, cost, latency)

## Quick Start

### Prerequisites

- [Podman](https://podman.io/) 4.0+ with [podman-compose](https://github.com/containers/podman-compose) 1.0+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# Clone
git clone https://github.com/bhanreddy1973/LLM-Inference-Gateway.git
cd LLM-Inference-Gateway

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Generate proto stubs
make proto

# Start all services
podman compose up --build
```

The gateway will be available at `http://localhost:8000`.

### Verify

```bash
# Health check
curl http://localhost:8000/v1/health

# Readiness (checks all dependencies)
curl http://localhost:8000/v1/health/ready
```

## Usage

### 1. Register a User

```bash
curl -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass123", "name": "Test User"}'
```

### 2. Login (Get JWT)

```bash
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass123"}'
```

### 3. Create an API Key

```bash
curl -X POST http://localhost:8000/v1/keys \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Key"}'
```

Save the returned `key` — it's only shown once.

### 4. Chat Completion

```bash
# Non-streaming
curl -X POST http://localhost:8000/v1/chat \
  -H "X-API-Key: sk-live-..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 256
  }'

# Streaming (SSE)
curl -X POST http://localhost:8000/v1/chat/stream \
  -H "X-API-Key: sk-live-..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 256
  }'
```

### 5. Check Usage

```bash
curl http://localhost:8000/v1/usage \
  -H "Authorization: Bearer <jwt_token>"
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/auth/register` | None | Register user |
| POST | `/v1/auth/login` | None | Get JWT token |
| POST | `/v1/keys` | JWT | Create API key |
| GET | `/v1/keys` | JWT | List API keys |
| DELETE | `/v1/keys/{id}` | JWT | Revoke key |
| POST | `/v1/chat` | API Key | Chat completion |
| POST | `/v1/chat/stream` | API Key | Streaming chat (SSE) |
| GET | `/v1/usage` | JWT | Usage summary |
| GET | `/v1/usage/analytics` | JWT | Detailed analytics |
| GET | `/v1/health` | None | Liveness probe |
| GET | `/v1/health/ready` | None | Readiness probe |

## Rate Limits

| Tier | Requests/min | Requests/day | Max Tokens |
|------|-------------|--------------|------------|
| Free | 10 | 100 | 1,024 |
| Pro | 60 | 5,000 | 4,096 |
| Enterprise | 300 | Unlimited | 8,192 |

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Gateway | FastAPI + Uvicorn | API layer, auth, routing |
| Worker | gRPC + Anthropic SDK | Inference, streaming |
| Database | PostgreSQL 16 | Users, keys, tiers |
| Cache | Redis 7.2 | Rate limiting, key cache |
| Analytics | ClickHouse 24.x | Request logs, usage stats |
| Containers | Podman + Compose | Orchestration |

## Project Structure

```
├── gateway/              # FastAPI application
│   ├── routers/          # API endpoints
│   ├── middleware/       # Auth, rate limiting, logging
│   ├── services/         # Business logic
│   ├── models/           # SQLAlchemy + Pydantic
│   └── utils/            # Hashing, key generation
├── worker/               # gRPC inference worker
├── proto/                # Protocol buffer definitions
├── migrations/           # Alembic database migrations
├── scripts/              # Init SQL, seed data
└── podman-compose.yml    # Multi-service orchestration
```

## Development

```bash
# Run database migrations
cd migrations && alembic upgrade head

# Seed test data
python scripts/seed_data.py

# Generate proto stubs
make proto
```

