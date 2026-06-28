# Roadmap — LLM Interceptor

Priority-ordered by task dependencies. Each phase delivers independently shippable value.

## Dependency Graph

```
Phase 1.A (Data Capture) ──→ Phase 2 (UI Overhaul) ──────────┐
Phase 1.B (OpenAI API)  ───┤                                 │
                           └──→ Phase 3 (Agent Integrations) ─→ Phase 4 (Admin Console) ─→ Phase 5 (Hardening)
```

---

## Phase 1 — Foundation

**Goal**: Richer data model + full OpenAI protocol support. Everything downstream depends on this.

### Track A — Enhanced Data Capture

| Task | Description | Files |
|------|-------------|-------|
| A1. Request params extraction | Parse `temperature`, `top_p`, `top_k`, `stop_sequences`, `tools`, `tool_choice`, `response_format`, `seed`, `user`, `metadata`, `thinking`, `service_tier` from request body and store as structured fields | `internal/proxy/`, `internal/storage/`, `internal/types/` |
| A2. System prompt extraction | Extract `system` field (Anthropic top-level or OpenAI `system`/`developer` role message) into a separate column | `internal/proxy/`, `internal/types/` |
| A3. Latency breakdown | Add TTFT (time-to-first-token), TBT (time-between-tokens), TPS (throughput) to StoredRequest | `internal/proxy/` |
| A4. Structured error tracking | Parse `error.type` and `error.message` from upstream error responses; store as separate columns | `internal/proxy/`, `internal/storage/`, `internal/types/` |
| A5. Price table sync | Add new models (especially reasoning models with cache/prediction pricing nuances) to cost tracker | `internal/plugins/cost_tracker.go` |
| A6. Storage migration | Add columns for new fields; version the schema for smooth upgrades | `internal/storage/sqlite.go`, `internal/storage/postgres.go` |

**Acceptance**: Every StoredRequest returned by the API has populated `temperature`, `stop_reason`, `error_type`, `ttft_ms` etc. (null allowed if unavailable, not missing from schema).

### Track B — OpenAI Chat Completions API

| Task | Description | Files |
|------|-------------|-------|
| B1. `/v1/chat/completions` endpoint | Register chi route; parse OpenAI request format; reuse proxy pipeline | `internal/api/handler.go` |
| B2. OpenAI passthrough | When `upstream` is an OpenAI base URL, forward directly without translation | `internal/proxy/` |
| B3. Full strem translation | Anthropic SSE events ↔ OpenAI SSE chunks (content, tool_calls delta, finish_reason, usage in final chunk) | `internal/translate/` |
| B4. Tool call translation | Anthropic `tool_use` ↔ OpenAI `tool_calls` (both sync and streaming delta) | `internal/translate/` |
| B5. Thinking / reasoning translation | Anthropic `thinking` block ↔ OpenAI `reasoning_content` / `completion_tokens_details.reasoning_tokens` | `internal/translate/` |
| B6. System prompt handling | Anthropic top-level `system` ↔ OpenAI `system`/`developer` role messages | `internal/translate/` |
| B7. Cross-protocol routing | Router mode: Anthropic request matched to OpenAI provider → auto-translate, and vice versa | `internal/router/` |

**Acceptance**: A request to `POST /v1/chat/completions` with `model: gpt-4o` works end-to-end in passthrough mode. A request to `POST /v1/messages` with `model: claude-sonnet-4` routed to an OpenAI provider auto-translates and returns valid Anthropic response.

---

## Phase 2 — UI Overhaul

**Goal**: Turn raw data into actionable insights. Redesign layout for clarity.

| Task | Description | Files |
|------|-------------|-------|
| 2.1. New API: `/api/stats/timeseries` | Per-minute/hour aggregated metrics for charting (requests, tokens, cost, errors) | `internal/api/handler.go`, `internal/storage/` |
| 2.2. Dashboard page | QPS gauge, error rate, P50/P95/P99 latency, daily cost sparkline, active sessions count | `ui/src/` |
| 2.3. Cost trend chart | Daily/weekly cost line chart with model breakdown | `ui/src/` |
| 2.4. Model analytics page | Per-model: request volume trend, avg latency, error rate, token efficiency | `ui/src/` |
| 2.5. Error analysis page | Error list grouped by `error_type`, error rate timeline, drill-down to affected requests | `ui/src/` |
| 2.6. Column selector | Hideable columns in Requests list; save preference to localStorage | `ui/src/` |
| 2.7. Time range filter | Date range picker for all list/cost pages | `ui/src/` |
| 2.8. CSV/JSON export | Export filtered requests list | `ui/src/`, `internal/api/` |
| 2.9. Dark mode | Tailwind dark variant, theme toggle, persist preference | `ui/src/` |
| 2.10. Layout redesign | Top navigation bar + breadcrumbs, card grid dashboard, consistent spacing | `ui/src/` |

**Acceptance**: A user opens the dashboard and sees live aggregate metrics. Requests list has column picker and date filter. Dark mode toggle works and persists across reloads.

---

## Phase 3 — Agent Platform Integration

**Goal**: Make LLM Interceptor the default gateway for local AI tooling.

| Task | Description | Files |
|------|-------------|-------|
| 3.1. `/api/agents/info` endpoint | Returns supported protocols, available models, health status | `internal/api/handler.go` |
| 3.2. Claude Code compatibility | Verify `x-claude-code-session-id` propagation, test streaming, document caveats | Testing |
| 3.3. OpenCode / Codex CLI config guide | OpenAI-compatible provider config snippet, environment variables | `ui/src/` |
| 3.4. Cline / Roo Code config guide | OpenAI-compatible provider config with `apiBaseUrl` pointing to interceptor | `ui/src/` |
| 3.5. Integration help page in UI | Dropdown to select agent → shows copyable config JSON / shell snippet | `ui/src/` |
| 3.6. End-to-end compatibility test | Agent → interceptor → upstream smoke test suite | `tests/` |

**Acceptance**: From the UI, a user selects "Cline" and copies a config snippet. Pasting it into Cline's settings makes Cline route through the interceptor.

---

## Phase 4 — Admin Console

**Goal**: Move config from YAML file to runtime-accessible UI.

| Task | Description | Files |
|------|-------------|-------|
| 4.1. JWT auth | Admin login endpoint, token validation middleware, auto-generated default credentials | `internal/api/`, `internal/auth/` |
| 4.2. Config state model | Runtime config stored in DB (overlay on top of YAML defaults) | `internal/config/`, `internal/storage/` |
| 4.3. Config CRUD API | Endpoints for pricing, budget, rate-limit, tools, providers settings | `internal/api/handler.go` |
| 4.4. Admin UI page | Form-based config editor with validation | `ui/src/` |
| 4.5. SSE hot-reload | On config change → publish event → plugins reload without restart | `internal/plugin/`, `internal/api/sse.go` |
| 4.6. Audit log | Track who changed what config, when | `internal/storage/` |

**Acceptance**: Admin logs in, changes budget limit from $0.50 to $1.00 via UI, and the next blocked request passes through without restarting the binary.

---

## Phase 5 — Production Hardening

**Goal**: Production-readiness — monitoring, reliability, performance.

| Task | Description | Files |
|------|-------------|-------|
| 5.1. Prometheus `/metrics` | Expose Go runtime + request metrics in Prometheus format (not just OTel) | `internal/api/handler.go` |
| 5.2. Alerting | Webhook/Slack/Email alerts for: budget exhaustion, high error rate, high latency | `internal/alerting/` |
| 5.3. Request body compression | Store large request/response bodies compressed (gzip/zstd) | `internal/storage/` |
| 5.4. Virtual scrolling | Replace flat list with virtualized list for 10k+ requests | `ui/src/` |
| 5.5. Pagination / cursor-based | Replace limit/offset with keyset pagination for large datasets | `internal/storage/`, `internal/api/` |
| 5.6. Integration test suite | End-to-end tests: proxy → upstream mock → storage → API | `tests/` |
| 5.7. Frontend tests | Vitest for utils, component tests with happy-dom | `ui/src/` |
| 5.8. OpenAPI / Swagger spec | Auto-generate from chi routes, serve at `/api/docs` | `internal/api/` |
| 5.9. Graceful shutdown | Drain in-flight requests, flush pending state/storage writes | `cmd/llm-interceptor/main.go` |
| 5.10. Log rotation | Structured JSON logs, rotation strategy in config | `internal/config/`, `cmd/llm-interceptor/` |

**Acceptance**: `go build ./... && go vet ./... && go test ./... -v && (cd ui && npm run build)` all green. Prometheus scrapes `/metrics`. Alert triggers when daily budget hits 90%.

---

## Summary

| Phase | Est. Effort | Delivers |
|-------|------------|----------|
| 1 | Large (2 tracks) | Better data + OpenAI support unlocks everything downstream |
| 2 | Medium | Visible value: better UX, more insights |
| 3 | Small | Differentiator: agent ecosystem integration |
| 4 | Large | Admin self-service, reduces YAML friction |
| 5 | Medium | Production safety net |

Phases 1–3 deliver the most user-facing value earliest. Phase 4 and 5 are hardening and governance for multi-user / production deployments.
