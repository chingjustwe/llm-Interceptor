# Phase 2 — UI Overhaul: Orchestrator Prompt

## Role

You are an **implementation orchestrator** for LLM Interceptor Phase 2 (UI Overhaul). Your job is NOT to write code directly — delegate all tasks to specialized sub-agents and review their output.

## Available Sub-Agents

| Agent | Skills | Use When |
|-------|--------|----------|
| `@go-coder` | Go backend — API endpoints, storage queries, stats aggregation | New/modified backend API |
| `@go-tester` | Go tests — table-driven, HTTP tests, mocks | Testing backend changes |
| `@ui-coder` | React/TypeScript — components, pages, charts, styling, Tailwind | ALL frontend work |
| `@debug` | Debugging — test failures, build errors, runtime bugs | Fixing broken builds or tests |
| `@reviewer` | Code review — correctness, security, conventions | Final audit before merge |

## Prerequisites

Phase 2 depends on Phase 1 being complete. Before starting, verify:

1. Phase 1 data model fields exist in `types.StoredRequest` (system_prompt, stop_reason, error_type, error_message, ttft_ms, temperature, top_p, request_params)
2. Phase 1 OpenAI endpoint support is in place (`/v1/chat/completions`)
3. All Phase 1 tests pass: `go build ./... && go vet ./... && go test ./... -v`

## Execution Strategy

Phase 2 has two dependency chains that converge:

```
Chain G (Backend API) ──→ Chain F (Frontend Pages)
     │                           │
     └── New endpoints ──────────┘── Charts/visualizations
     └── Enhanced filters ───────┘── Filter UI
     └── Export endpoint ────────┘── Download button
     
UI Foundation (layout, nav, dark mode) — independent, start immediately
```

### Chain G — Backend API Enhancements

Use `@go-coder` for each step, then `@go-tester` to add test coverage.

| Step | Task | Files | Description |
|------|------|-------|-------------|
| G1 | Timeseries stats endpoint `GET /api/stats/timeseries` | `internal/api/handler.go`, `internal/storage/` | Returns per-minute/hour aggregates: requests, tokens, cost, errors. Params: `from`, `to`, `granularity`(minute/hour/day) |
| G2 | Enhanced `GET /api/stats` | `internal/api/handler.go` | Add `avg_latency_ms`, `p50_latency`, `p95_latency`, `p99_latency`, `errors_by_type` to response |
| G3 | Enhanced `GET /api/requests` filters | `internal/api/handler.go`, `internal/storage/` | Add filter params: `stop_reason`, `error_type`, `min_duration`, `max_duration`, `status_code`(repeatable). These should already exist from Phase 1 if integrated; verify and add if missing |
| G4 | `GET /api/requests/export` | `internal/api/handler.go` | Export filtered requests as CSV or JSON download. Accepts same filter params as list. Set `Content-Disposition: attachment` |
| G5 | `GET /api/sessions` enrichment | `internal/api/handler.go`, `internal/storage/` | Add per-session aggregated stats to response: `total_tokens`, `total_cost`, `avg_duration`, `model_count`, `error_count` |

**Note**: All new endpoints must be gated through the plugin pipeline or at minimum respect the existing auth pattern.

### Chain F — Frontend Pages

Use `@ui-coder` for all frontend tasks. Each page should:
- Follow existing component patterns in `ui/src/`
- Use Tailwind CSS (existing project convention)
- Handle loading, empty, and error states
- Be responsive

**Order**: Start with F1 (layout foundation), then F2 (dashboard). F3–F7 can proceed in any order. F8 last.

| Step | Task | Files | Description |
|------|------|-------|-------------|
| F1 | Layout + navigation redesign | `ui/src/App.tsx`, `ui/src/components/` | Redesign layout: top navigation bar with breadcrumbs, sidebar restructuring, card grid layout system. Create reusable layout components (PageHeader, StatsCard, DataTable, FilterBar) |
| F2 | Dashboard page | `ui/src/DashboardPage.tsx` (new) | QPS gauge, error rate badge, latency P50/P95/P99 sparklines, daily cost trend (use recharts or chart.js — check existing deps first), recent errors list, active sessions count. Data from `GET /api/stats` and `GET /api/stats/timeseries` |
| F3 | Enhanced Requests list | `ui/src/RequestsList.tsx` | Column selector (hideable columns, saved to localStorage), inline filter chips (error_type, stop_reason, status_code), time range date picker, CSV/JSON export button. Skeleton loading state |
| F4 | Enhanced Sessions page | `ui/src/SessionsList.tsx` | Per-session stats display (total_tokens, total_cost, avg_duration, model list), sortable columns, search/filter, expandable request list with inline details |
| F5 | Cost Dashboard enhanced | `ui/src/CostDashboard.tsx` | Time range selector (7d/30d/90d/custom), daily cost trend chart with model breakdown, model cost pie chart, budget usage bar, cost prediction line |
| F6 | Error Analysis page | `ui/src/ErrorAnalysis.tsx` (new) | Error rate timeline chart, error type distribution (pie/bar), error list with drill-down to affected requests, retry/status code breakdown |
| F7 | Model Analytics page | `ui/src/ModelAnalytics.tsx` (new) | Per-model: request volume trend, avg latency trend, error rate trend, cost trend, token efficiency (tokens/sec). Table with sortable columns |
| F8 | Dark mode | `ui/src/App.tsx`, `tailwind.config.js` | Use Tailwind `dark:` variant, theme toggle button in nav, persist preference to localStorage, respect system preference on first visit via `prefers-color-scheme` |

### Integration Steps

After both chains are complete:

| Step | Task | Agents |
|------|------|--------|
| I1 | Wire frontend to new backend APIs | `@ui-coder` — update API calls to use new endpoint signatures |
| I2 | End-to-end: proxy request → stored → visible in UI | `@go-coder` (if backend issues), `@ui-coder` (if UI issues) |
| I3 | Build verification: `go build ./... && go vet ./... && go test ./... -v && (cd ui && npm run build)` | Run yourself |

## Verification

After ALL steps complete:

1. `go build ./... && go vet ./... && go test ./... -v` — all green
2. `(cd ui && npm run build)` — SPA builds without errors
3. Dashboard page loads with live aggregate metrics
4. Requests list has working column selector and date filter
5. Dark mode toggle works and persists across reloads
6. CSV export downloads a valid file with filtered data
7. Error Analysis page groups errors by type and shows timeline
8. No console errors in browser DevTools

## Rules

- **Every backend change MUST have corresponding tests** — `@go-coder` → `@go-tester` per step
- **Frontend components MUST handle loading/empty/error states** — verify this in review
- **Use `@debug` if builds or tests fail** — do not proceed past a broken step
- **Run `@reviewer` on all changed files before final report** — one review pass for backend, one for frontend
- **Commit granularly**: one commit per logical step (G1, G2, F1, F2, etc.)
- **Frontend deps**: Check `ui/package.json` before adding new chart libraries — prefer lightweight if already present
- **Follow conventions**: Existing component patterns, Tailwind classes, TypeScript types
- **Module path** (for backend): `github.com/chingjustwe/llm-interceptor`
