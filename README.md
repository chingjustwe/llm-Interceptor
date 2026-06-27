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
git clone https://github.com/chingjustwe/llm-Interceptor.git
cd llm-interceptor

# Install frontend deps (first time only)
(cd ui && npm install)

# Build (Go binary + embedded SPA)
go build -o llm-interceptor ./cmd/llm-interceptor/

# Run with default config (passthrough mode)
./llm-interceptor config.example.yaml
```

## Configuration

See [config.example.yaml](config.example.yaml) for all available options.

## Development

```bash
# Run Go tests
go test ./...

# Run frontend dev server (proxies /api to Go backend at :8081)
cd ui && npm run dev

# Build frontend for production
cd ui && npm run build
```

## License

MIT
