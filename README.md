# LLM Inference Gateway

A self-hostable, production-grade API gateway for Anthropic Claude models with a full-featured management dashboard. One `podman compose up` gives you authentication, per-key rate limiting, streaming inference, ClickHouse analytics, and a beautiful dark-theme UI — all running locally.

```
Client → FastAPI Gateway → gRPC Worker → Anthropic Claude API
              │
              ├─ PostgreSQL  — users, API keys, tiers
              ├─ Redis       — sliding-window rate limiting, key cache
              └─ ClickHouse  — request logs, usage analytics
```

---

## Screenshots

| Dashboard Overview | API Keys | Analytics |
|---|---|---|
| Stat cards, live request chart, recent requests | Create keys with per-key RPM/RPD limits | Time-series charts, model breakdown, cost tracking |

| Playground | Request Logs | System Status |
|---|---|---|
| Live streaming chat with Claude | Filterable, paginated log inspector | Real-time service health with auto-refresh |

---

## Features

**Backend**
- 🔑 API key authentication — SHA-256 hashed, Redis-cached (5 min TTL)
- 🚦 Per-key rate limiting — Redis sliding window via Lua script
- ⚡ Streaming inference — SSE (Server-Sent Events), OpenAI-compatible format
- 🔌 gRPC workers — scalable inference layer with circuit breaker + retry
- 📊 Async analytics — batched ClickHouse inserts, materialized views
- 🎛️ Dynamic per-key limits — override tier defaults per API key
- 👤 Account management — name/password updates via `PATCH /v1/auth/me`

**Frontend (Next.js Dashboard)**
- 📈 Overview — stat cards, 14-day area chart, recent requests
- 🗝️ API Keys — create/revoke keys with custom RPM, RPD, max-token limits
- 📊 Analytics — 4-chart grid (area + line + 2 bar), model breakdown table
- 💬 Playground — streaming chat UI, model selector, system prompt presets, parameter sliders
- 📋 Request Logs — filterable by model/status/period, paginated, expandable rows
- 🟢 System Status — live PostgreSQL/Redis/gRPC health cards, 40-slot uptime history
- ⚙️ Settings — profile editing, password change, tier limits display

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Podman | 4.0+ | [podman.io](https://podman.io/docs/installation) |
| podman-compose | 1.0+ | `pip install podman-compose` |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) (only if running frontend outside containers) |
| Python | 3.11+ | [python.org](https://python.org) (only if running gateway outside containers) |
| Anthropic API key | — | [console.anthropic.com](https://console.anthropic.com) |

> **Docker users:** Replace every `podman` command with `docker` and `podman-compose` with `docker compose`. Everything else is identical.

---

## Quick Start

### 1 — Clone & configure

```bash
git clone https://github.com/bhanreddy1973/LLM-Inference-Gateway.git
cd LLM-Inference-Gateway

cp .env.example .env
```

Open `.env` and set your Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxx
```

The other values work as-is for local development:

```env
DATABASE_URL=postgresql+asyncpg://gateway:gateway@localhost:5432/inference_gw
REDIS_URL=redis://localhost:6379/0
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
JWT_SECRET=change-me-in-production
GRPC_WORKER_HOST=localhost
GRPC_WORKER_PORT=50051
```

### 2 — Generate gRPC stubs

The gateway and worker communicate over gRPC. Generate the Python stubs once:

```bash
# Create a venv and install grpcio-tools
make venv

# Compile proto/inference.proto → gateway/ and worker/
make proto
```

### 3 — Start all services

```bash
podman compose up --build
```

First build takes ~3 minutes (downloads images + builds containers). Subsequent starts are ~15 seconds.

Services started:
| Service | Port | What it is |
|---------|------|-----------|
| `frontend` | 3000 | Next.js dashboard |
| `gateway` | 8000 | FastAPI REST API |
| `worker` | 50051 | gRPC inference worker |
| `postgres` | 5432 | User/key database |
| `redis` | 6379 | Rate limit cache |
| `clickhouse` | 8123 | Analytics store |

### 4 — Run database migrations

In a new terminal, while containers are running:

```bash
podman exec -it llm-inference-gateway_gateway_1 \
  alembic -c /app/alembic.ini upgrade head
```

Or run migrations from the `migrations/` directory on your host:

```bash
cd migrations
pip install alembic asyncpg sqlalchemy psycopg2-binary
DATABASE_URL=postgresql+asyncpg://gateway:gateway@localhost:5432/inference_gw \
  alembic upgrade head
```

### 5 — Seed test data (optional)

Creates three users (free / pro / enterprise tiers) with API keys:

```bash
podman exec -it llm-inference-gateway_gateway_1 \
  python /app/scripts/seed_data.py
```

The script prints the generated API keys — **copy them**, they are not shown again.

### 6 — Open the dashboard

- **Dashboard:** http://localhost:3000
- **API docs (Swagger):** http://localhost:8000/docs
- **API docs (ReDoc):** http://localhost:8000/redoc

Register a new account or log in with seeded credentials:

| Email | Password | Tier |
|-------|----------|------|
| `admin@example.com` | `admin12345` | enterprise |
| `pro@example.com` | `prouserpw` | pro |
| `free@example.com` | `freeuserpw` | free |

---

## Local Development (without containers)

If you want hot-reload during development, run each service directly.

### Backend — FastAPI Gateway

```bash
cd gateway
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Start infrastructure only (postgres, redis, clickhouse, worker)
podman compose up postgres redis clickhouse worker -d

# Run gateway with hot-reload
uvicorn main:app --reload --port 8000
```

### Backend — gRPC Worker

```bash
cd worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

ANTHROPIC_API_KEY=sk-ant-... python main.py
```

### Frontend — Next.js

```bash
cd frontend
cp .env.example .env.local          # already has NEXT_PUBLIC_API_URL=http://localhost:8000
pnpm install                        # or npm install / yarn install
pnpm dev                            # starts on http://localhost:3000
```

> If port 3000 is occupied (e.g. by the containerised frontend), Next.js automatically uses 3001.

---

## Usage — API Examples

### Register & authenticate

```bash
# Register a new user
curl -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "password123", "name": "Your Name"}'

# Log in — returns a JWT
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "password123"}'
# → {"access_token": "eyJ...", "token_type": "bearer"}

export JWT="eyJ..."
```

### Create an API key (with optional rate limits)

```bash
# Basic key (uses your tier defaults)
curl -X POST http://localhost:8000/v1/keys \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'

# Key with custom limits (overrides tier defaults for this key)
curl -X POST http://localhost:8000/v1/keys \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI Bot",
    "requests_per_minute": 3,
    "requests_per_day": 50,
    "max_tokens_per_request": 512
  }'
# → {"id": "...", "key": "sk-live-abc123...", ...}

export API_KEY="sk-live-abc123..."
```

The full key is shown **only once**. Store it securely.

### Chat (non-streaming)

```bash
curl -X POST http://localhost:8000/v1/chat \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "Explain gRPC in one sentence."}],
    "max_tokens": 256,
    "temperature": 0.7
  }'
```

### Chat (streaming SSE)

```bash
curl -X POST http://localhost:8000/v1/chat/stream \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-haiku-4-20250514",
    "messages": [{"role": "user", "content": "Count to 5."}],
    "max_tokens": 64
  }'
# Streams back: data: {"choices":[{"delta":{"content":"1"}}]}
#               data: [DONE]
```

### Analytics & logs

```bash
# Usage summary (last 30 days)
curl http://localhost:8000/v1/usage/analytics?days=30 \
  -H "Authorization: Bearer $JWT"

# Paginated request logs (filter by model + status)
curl "http://localhost:8000/v1/usage/logs?model=claude-sonnet-4-20250514&status_code=200&days=7&page=1" \
  -H "Authorization: Bearer $JWT"
```

### Update a key's limits

```bash
# Patch an existing key (null clears the override, reverting to tier default)
curl -X PATCH http://localhost:8000/v1/keys/<key-id> \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"requests_per_minute": 5, "requests_per_day": null}'
```

### Update your profile / password

```bash
curl -X PATCH http://localhost:8000/v1/auth/me \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name"}'

curl -X PATCH http://localhost:8000/v1/auth/me \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"current_password": "oldpass", "new_password": "newpass123"}'
```

---

## Full API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v1/auth/register` | — | Register new user |
| `POST` | `/v1/auth/login` | — | Login → JWT token |
| `GET` | `/v1/auth/me` | JWT | Get current user profile + tier |
| `PATCH` | `/v1/auth/me` | JWT | Update name or password |
| `GET` | `/v1/keys` | JWT | List all API keys |
| `POST` | `/v1/keys` | JWT | Create key (with optional custom limits) |
| `PATCH` | `/v1/keys/{id}` | JWT | Update key name / limits |
| `DELETE` | `/v1/keys/{id}` | JWT | Revoke key permanently |
| `POST` | `/v1/chat` | API Key | Chat completion (batch) |
| `POST` | `/v1/chat/stream` | API Key | Chat completion (SSE stream) |
| `GET` | `/v1/usage/analytics` | JWT | Time-series stats, model breakdown |
| `GET` | `/v1/usage/logs` | JWT | Paginated request log (ClickHouse) |
| `GET` | `/v1/health` | — | Liveness probe |
| `GET` | `/v1/health/ready` | — | Readiness probe (all deps) |

> Interactive docs always available at **http://localhost:8000/docs**

---

## Rate Limits

Limits are applied per API key. Each key inherits tier defaults unless custom limits are set:

| Tier | Req / min | Req / day | Max tokens / req |
|------|-----------|-----------|-----------------|
| free | 10 | 100 | 1 024 |
| pro | 60 | 5 000 | 4 096 |
| enterprise | 300 | 50 000 | 8 192 |

To give a key tighter limits than its tier (e.g. for a CI bot or a team member):

```bash
# This key allows only 3 req/min regardless of the owner's tier
curl -X PATCH http://localhost:8000/v1/keys/<key-id> \
  -H "Authorization: Bearer $JWT" \
  -d '{"requests_per_minute": 3}'
```

Rate limit headers are returned on every response:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1716700060
```

---

## Project Structure

```
llm-inference-gateway/
│
├── podman-compose.yml          # Orchestrates all 6 services
├── .env.example                # Copy to .env, fill ANTHROPIC_API_KEY
├── Makefile                    # make venv / make proto
│
├── proto/
│   └── inference.proto         # gRPC service + message definitions
│
├── gateway/                    # FastAPI application (port 8000)
│   ├── main.py                 # App entry point, CORS, lifespan
│   ├── config.py               # Settings via pydantic-settings
│   ├── routers/
│   │   ├── auth.py             # /v1/auth/*
│   │   ├── keys.py             # /v1/keys/*
│   │   ├── chat.py             # /v1/chat, /v1/chat/stream
│   │   ├── usage.py            # /v1/usage/analytics, /v1/usage/logs
│   │   ├── health.py           # /v1/health, /v1/health/ready
│   │   └── models.py           # /v1/models
│   ├── middleware/
│   │   ├── auth.py             # API key validation (Redis cache → Postgres)
│   │   ├── rate_limiter.py     # Sliding-window Lua script via Redis
│   │   └── request_logger.py   # Async batch logger → ClickHouse
│   ├── services/
│   │   ├── key_service.py      # Key creation, hashing, custom limits
│   │   ├── analytics_service.py# ClickHouse queries, logs pagination
│   │   └── inference_client.py # gRPC client to worker
│   ├── models/
│   │   ├── database.py         # SQLAlchemy ORM (User, ApiKey)
│   │   └── schemas.py          # Pydantic request/response models
│   └── utils/
│       ├── hashing.py          # bcrypt passwords, SHA-256 keys
│       └── key_generator.py    # sk-live-<random> generation
│
├── worker/                     # gRPC inference server (port 50051)
│   ├── main.py                 # gRPC server entry point
│   ├── inference_handler.py    # Anthropic SDK, streaming, retries
│   ├── circuit_breaker.py      # Stop hammering Anthropic on 5xx
│   └── retry.py                # Exponential backoff
│
├── migrations/                 # Alembic database migrations
│   └── versions/
│       ├── 001_initial_schema.py   # Users, API keys, indexes
│       └── 002_key_custom_limits.py# Per-key RPM/RPD/max-token columns
│
├── scripts/
│   ├── init_clickhouse.sql     # inference_logs table + materialized view
│   ├── seed_data.py            # Creates 3 test users with API keys
│   └── clickhouse-config/
│       └── default-user.xml    # Allows ClickHouse connections from containers
│
└── frontend/                   # Next.js 16 dashboard (port 3000)
    ├── app/
    │   ├── (marketing)/        # Public landing page (isolated layout)
    │   ├── login/              # Login page
    │   ├── register/           # Registration page
    │   ├── forgot-password/    # Password reset page
    │   └── dashboard/          # Protected dashboard (auth guard)
    │       ├── layout.tsx      # Sidebar + auth guard
    │       ├── page.tsx        # Overview
    │       ├── keys/           # API key management
    │       ├── usage/          # Analytics charts
    │       ├── logs/           # Request log inspector
    │       ├── playground/     # Live chat UI
    │       ├── status/         # System health
    │       └── settings/       # Account + tier info
    └── lib/
        └── api.ts              # All API calls, types, error handling
```

---

## How It Works

### Request lifecycle

```
1. Client sends:  POST /v1/chat   X-API-Key: sk-live-abc…

2. Auth middleware
   └─ Hash key → check Redis cache (5 min TTL)
   └─ Cache miss → query PostgreSQL → store in Redis
   └─ Attach user_id + tier + key limits to request context

3. Rate limiter middleware
   └─ Run Lua sliding-window script against Redis
   └─ key-level limits take priority over tier defaults
   └─ Return 429 + Retry-After if exceeded

4. Chat router → gRPC InferenceClient
   └─ Forward to worker:50051

5. Worker
   └─ Call Anthropic API (streaming)
   └─ Stream tokens back via gRPC server-streaming

6. Gateway
   └─ Convert gRPC stream → SSE (text/event-stream)
   └─ Flush response to client token by token

7. After last token
   └─ Queue log entry (async, non-blocking)
   └─ Background task batches 100 entries or flushes every 5 s
   └─ INSERT into ClickHouse inference_logs table
```

### Key hashing

API keys are never stored in plaintext. On creation:
1. Generate `sk-live-<48 random hex chars>`
2. Store `sha256(key)` in PostgreSQL
3. Store first 12 chars as `key_prefix` (for display)
4. Return the full key to the user **once only**

On each request: `sha256(X-API-Key header)` is looked up in Redis then Postgres.

### ClickHouse analytics

Every completed request is logged to the `inference_logs` table asynchronously. A ClickHouse materialized view (`user_usage_daily`) aggregates per user/day/model automatically — the `/v1/usage/analytics` endpoint queries this view for fast dashboard loads.

---

## Dashboard Pages

| URL | Description |
|-----|-------------|
| `/` | Public landing page |
| `/login` | Sign in with email + password |
| `/register` | Create new account (auto-login after) |
| `/forgot-password` | Password reset flow |
| `/dashboard` | Overview: stat cards, 14-day chart, recent requests |
| `/dashboard/keys` | Create/revoke API keys with per-key rate limits |
| `/dashboard/usage` | Charts: requests, latency, cost, model breakdown |
| `/dashboard/logs` | Full paginated log inspector with filters |
| `/dashboard/playground` | Live streaming chat with any Claude model |
| `/dashboard/status` | System health for all 3 backend services |
| `/dashboard/settings` | Update name, password; view tier limits |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | Next.js | 16 (Turbopack) |
| UI library | React | 19 |
| Styling | Tailwind CSS | v4 |
| Components | shadcn/ui | latest |
| Charts | evilcharts (shadcn registry) | latest |
| Icons | lucide-react | latest |
| API gateway | FastAPI + Uvicorn | 0.115 |
| Auth | python-jose (JWT) + passlib (bcrypt) | — |
| ORM | SQLAlchemy (async) + asyncpg | 2.0 |
| Migrations | Alembic | 1.13 |
| Rate limiting | Redis 7.2 + Lua scripts | — |
| Inference | gRPC + Anthropic Python SDK | — |
| Analytics | ClickHouse 24.8 | — |
| Containers | Podman + podman-compose | 4.0+ |

---

## Troubleshooting

### Gateway returns 500 on analytics endpoints

ClickHouse's default user is restricted to localhost only. The included `scripts/clickhouse-config/default-user.xml` overrides this to allow connections from container IPs. If you see ClickHouse auth errors:

```bash
# Verify the config mount is applied
podman exec llm-inference-gateway_clickhouse_1 \
  cat /etc/clickhouse-server/users.d/default-user.xml
```

Should show `<networks><ip>::0/0</ip></networks>`.

### "Cannot connect to backend" in the dashboard

Check that the gateway is healthy:

```bash
curl http://localhost:8000/v1/health/ready
# → {"status":"ready","checks":{"postgres":{"status":"healthy"},...}}
```

If `worker` shows `unhealthy`, your `ANTHROPIC_API_KEY` may be missing or invalid.

### Port conflicts

If port 3000 is already in use, the containerised frontend won't start. Either:
- Stop the conflicting process: `lsof -ti:3000 | xargs kill`
- Or run the frontend locally (`pnpm dev` uses 3001 automatically if 3000 is busy)

### Migrations fail ("relation already exists")

The initial migration is idempotent if run twice, but if you hit issues:

```bash
# Drop and recreate (destroys all data)
podman exec llm-inference-gateway_postgres_1 \
  psql -U gateway -d inference_gw -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Then re-run migrations
podman exec llm-inference-gateway_gateway_1 alembic upgrade head
```

### Reset everything

```bash
podman compose down -v   # stops containers AND deletes volumes
podman compose up --build
```

---

## Environment Variables Reference

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `ANTHROPIC_API_KEY` | — | ✅ | Your Anthropic API key |
| `DATABASE_URL` | `postgresql+asyncpg://gateway:gateway@postgres:5432/inference_gw` | ✅ | Postgres connection string |
| `REDIS_URL` | `redis://redis:6379/0` | ✅ | Redis connection string |
| `CLICKHOUSE_HOST` | `clickhouse` | ✅ | ClickHouse hostname |
| `CLICKHOUSE_PORT` | `8123` | ✅ | ClickHouse HTTP port |
| `JWT_SECRET` | `change-me-in-production` | ✅ | Secret for signing JWTs — **change this** |
| `JWT_ALGORITHM` | `HS256` | — | JWT signing algorithm |
| `JWT_EXPIRY_MINUTES` | `30` | — | Token lifetime |
| `GRPC_WORKER_HOST` | `worker` | ✅ | gRPC worker hostname |
| `GRPC_WORKER_PORT` | `50051` | ✅ | gRPC worker port |
| `CORS_ORIGINS` | `http://localhost:3000,...` | — | Allowed CORS origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | ✅ | Frontend → backend URL |

---
