# Acheron — Dashboard Frontend

The Next.js 16 management dashboard for the LLM Inference Gateway. Built with React 19, Tailwind v4, shadcn/ui, and evilcharts.

---

## Stack

| | |
|--|--|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Charts | evilcharts (area, line, bar) |
| Icons | lucide-react |
| HTTP | Native `fetch` with custom `ApiError` class |

---

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/(marketing)/page.tsx` | Public landing page |
| `/login` | `app/login/page.tsx` | Email + password sign-in |
| `/register` | `app/register/page.tsx` | New account (auto-logs in) |
| `/forgot-password` | `app/forgot-password/page.tsx` | Password reset flow |
| `/dashboard` | `app/dashboard/page.tsx` | Stat cards, 14-day chart, recent requests |
| `/dashboard/keys` | `app/dashboard/keys/page.tsx` | Create/revoke keys with per-key RPM/RPD limits |
| `/dashboard/usage` | `app/dashboard/usage/page.tsx` | 4-chart analytics grid + model breakdown |
| `/dashboard/logs` | `app/dashboard/logs/page.tsx` | Paginated log inspector with filters |
| `/dashboard/playground` | `app/dashboard/playground/page.tsx` | Live streaming chat UI |
| `/dashboard/status` | `app/dashboard/status/page.tsx` | System health (auto-refresh every 15 s) |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Profile, password, tier limits |

---

## Running locally

### Prerequisites

- Node.js 18+
- pnpm (recommended) — `npm install -g pnpm`
- The backend running at `http://localhost:8000`

### Install & start

```bash
cd frontend
pnpm install

# Point at the backend
cp .env.example .env.local
# .env.local already contains:
# NEXT_PUBLIC_API_URL=http://localhost:8000

pnpm dev
# → http://localhost:3000 (or 3001 if 3000 is busy)
```

### Type-check

```bash
pnpm tsc --noEmit
```

### Build for production

```bash
pnpm build
pnpm start
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |

---

## Key design decisions

**Route groups** — `app/(marketing)/` isolates the public landing page so it gets its own nav/footer layout without leaking into dashboard pages.

**Auth guard** — `app/dashboard/layout.tsx` calls `GET /v1/auth/me` on mount. It only redirects to `/login` on `401`/`403` — network errors (backend down) let you stay on the dashboard so you don't get logged out when restarting services.

**API client** — `lib/api.ts` is a single file with all typed fetch wrappers. Throws `ApiError` (with `.status` and `.detail`) on non-2xx responses so every page can handle auth errors consistently.

**evilcharts** — Installed via the shadcn registry, not npm. Components live in `components/evilcharts/`. Chart config objects must use `const config = {` (inferred type) — not `const config: ChartConfig =`.

**Playground API key** — Chat endpoints use `X-API-Key` (not `Authorization: Bearer`). The Playground page has a password field where users paste their full `sk-live-…` key.

**Dynamic tier limits** — The Keys page and Settings page call `GET /v1/auth/me` to get the real tier, then look up `TIER_DEFAULTS[tier]` to show the right limit placeholders. Nothing is hardcoded to `free`.

---

## Adding shadcn components

```bash
pnpm dlx shadcn@latest add button
# → places component in components/ui/
```

## Adding evilcharts

```bash
pnpm dlx shadcn@latest add @evilcharts/area-chart
# → places component in components/evilcharts/charts/area-chart.tsx
```
