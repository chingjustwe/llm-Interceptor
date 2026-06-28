# LLM Interceptor

[![Go Version](https://img.shields.io/badge/Go-1.26.3-blue)](https://go.dev/dl/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**LLM Interceptor** is a local-first, open-source LLM gateway. It sits between your application and LLM providers (OpenAI, Anthropic, etc.), providing transparent proxying, observability (OTel), governance (budget/rate-limit/tool-policy), multi-provider routing, protocol translation, and a web UI — all in a single Go binary.

## Features

- **Transparent Proxy** — Drop-in replacement for Anthropic Messages API; works with Claude Code and other Anthropic SDKs. OpenAI Chat API supported via protocol translation (text-only, non-streaming).
- **Streaming Relay** — SSE passthrough with full metadata capture
- **Plugin Architecture** — Extend behavior via Go interfaces (OTel, cost tracking, rate limiting, custom logic)
- **Observability** — OpenTelemetry traces, metrics (token usage, latency, error rates)
- **Governance** — Per-key budget, rate limiting, tool-use policies
- **LLM Router** — Auto-detect provider from API key format (`sk-lli-*`), multi-tenant key management (bcrypt), protocol translation (Anthropic ↔ OpenAI)
- **Web UI** — Visual dashboard for requests, sessions, cost, and API key management
- **Dual Storage** — SQLite (dev/single-node) or PostgreSQL (production)
- **Dual State** — In-memory (dev) or Redis (production)
- **Config-driven** — Single YAML file for all settings

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Application │────▶│ LLM Interceptor  │────▶│ LLM Provider │
│ (SDK/HTTP)  │     │  :8080           │     │ (Anthropic,  │
└─────────────┘     └──────────────────┘     │  OpenAI, …)  │
                           │                 └──────────────┘
                    ┌──────┴──────┐
                    │  Plugins    │
                    │ (OTel,Cost, │
                    │  Budget,    │
                    │  RateLimit, │
                    │  ToolPolicy)│
                    └──────┬──────┘
                           │
               ┌───────────┴───────────┐
               │                       │
          ┌────┴────┐           ┌──────┴──────┐
          │ Storage │           │    State    │
          │(SQLite  │           │ (In-Memory  │
          │ /PG)    │           │  /Redis)    │
          └─────────┘           └─────────────┘

               ┌──────────────────────────┐
               │   Web UI (React SPA)     │
               │  embedded via embed.FS   │
               └──────────────────────────┘
```

## Quick Start

```bash
# Clone
git clone https://github.com/chingjustwe/llm-interceptor.git
cd llm-interceptor

# Install frontend deps (first time only) and build SPA
(cd ui && npm install && npm run build)

# Build Go binary (embeds ui/dist/ automatically)
go build -o llm-interceptor ./cmd/llm-interceptor/

# Run with default config (passthrough mode)
./llm-interceptor config.example.yaml
```

### Docker Compose (one-click)

```bash
# Build and start (requires Docker)
ANTHROPIC_API_KEY=sk-ant-... docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The app runs with SQLite + in-memory state by default, no external dependencies needed. For PostgreSQL, Redis, or OTel, append the relevant compose files from `deploy/`:

```bash
docker compose -f docker-compose.yml \
  -f deploy/docker-compose-pg.yml \
  -f deploy/docker-compose-redis.yml \
  up -d
```

## Configuration

See [config.example.yaml](config.example.yaml) for all available options.

## Development

### Backend (Go)

```bash
# Build
go build -o llm-interceptor ./cmd/llm-interceptor/

# Test
go test ./...

# Run locally
./llm-interceptor config.example.yaml
```

### Frontend (React SPA)

```bash
cd ui

# Install dependencies
npm install

# Dev server (proxies /api to backend at :8080)
npm run dev

# Production build
npm run build
```

The SPA is embedded in the Go binary via `embed.FS`. During development, run `npm run dev` for hot-reload (proxies `/api` to the Go backend running separately on `:8080`), then build with `npm run build` before `go build` to embed the latest UI.

## License

MIT
