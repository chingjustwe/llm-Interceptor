# LLM Interceptor

Local-first, open-source LLM gateway. Transparent proxy, observability (OTel), governance (budget/rate-limit/tool-policy), LLM routing (multi-provider), and a web UI — all in a single Go binary.

## Stack
- **Language:** Go 1.26.3
- **HTTP:** `chi/v5`
- **Config:** `yaml.v3`
- **Database:** SQLite (`modernc.org/sqlite`), PostgreSQL (`pgx`)
- **State:** In-memory, Redis
- **Observability:** OpenTelemetry
- **Frontend:** React, Vite, Tailwind CSS, TypeScript

## Directory Layout
```
cmd/llm-interceptor/        main.go (embed.FS for SPA + OpenAPI spec)
internal/
├── config/                 YAML config loader (runtime overlay, alerting, compression config)
├── types/                  Shared types (StoredRequest, TokenUsage, RequestFilter, ConfigEntry, AuditEntry)
├── plugin/                 Plugin interface + Dispatcher
├── proxy/                  HTTP passthrough proxy + SSE streaming relay
├── storage/                Storage abstraction (SQLite, PostgreSQL) with gzip compression
├── state/                  State store abstraction (in-memory, Redis)
├── plugins/                Built-in plugins (otel, cost-tracker, budget, ratelimit, tool-policy)
├── api/                    REST API + SSE broker, OpenAPI spec serving, cursor pagination
├── router/                 Mode detection + provider routing + key management
├── translate/              Protocol translation (Anthropic ↔ OpenAI, streaming SSE)
├── metrics/                Prometheus metrics (requests_total, duration, tokens, cost, active_requests)
├── alerting/               Best-effort alerting: evaluator, Slack/Webhook/Email notifiers
└── log/                    Structured logging setup (slog, JSON/text handlers)
ui/                         React SPA (Vite + TypeScript + Tailwind)
tests/                      Integration tests (SQLite + in-memory + HTTP test harness)
docs/                       OpenAPI 3.0 specification
deploy/                     Docker Compose extras (PostgreSQL, Redis, OTel)
Dockerfile                  Multi-stage Docker build
docker-compose.yml          One-click startup with Docker Compose
config.docker.yml           Docker-optimized configuration
```

## Phases
1. Core MVP: proxy, plugin framework, config, SQLite + in-memory state
2. OTel exporter plugin
3. Governance: cost/budget/ratelimit/tool-policy, Redis, PostgreSQL
4. LLM Router: mode detection, API key management, protocol translation
5. React SPA frontend
6. Production hardening: Prometheus metrics, gzip compression, cursor pagination, alerting, structured logging (slog), OpenAPI spec, graceful shutdown, integration tests

## Code Style
- Every file must have a package-level comment explaining its purpose.
- Every exported type, function, and method must have a Go doc comment (`// PackageName ...`, `// TypeName ...`, `// FuncName ...`).
- Non-trivial internal/unexported logic must have inline comments explaining the "why" (not the "what").
- Avoid magic values — name them as constants with comments.
- Comments should be in English.

## Development Workflow
- Every code change MUST include corresponding tests. No exception — new features, bugfixes, and refactors all require test coverage.
- Before claiming work is complete, run `go build ./... && go vet ./... && go test ./... -v && (cd ui && npm run build)` and confirm all green.
- Commit granularly: one logical change per commit.
- **README/AGENTS.md sync**: Any change to the project (new features, config changes, CLI flags, Docker/CI setup, dependency updates) MUST check if README.md and/or AGENTS.md need updating. Keep both files accurate — they are the primary documentation for humans and agents.

## Key Principles
- Plugin architecture via Go interfaces (in-process)
- Forward path never blocked — OTel/state updates async, metrics collection async
- Dual mode: passthrough (default) and router (managed keys `sk-lli-*`)
- Metadata map on context is inter-plugin communication channel
- Storage/State are interface-abstracted, implementations swappable
- Metrics use isolated Prometheus registry (not global default)
- Alerting is best-effort — never blocks request processing
- Log rotation is external (logrotate, Docker log driver)
- Cursor-based pagination is opt-in alongside existing offset-based pagination
