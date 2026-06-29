# API Reference

## Proxy Endpoints

### POST /v1/messages

Proxy Anthropic Messages API requests.

**Auth:** `x-api-key` header (passthrough) or `Authorization: Bearer sk-lli-*` (router mode).
**Request body:** Standard Anthropic Messages API JSON.
**Response:** Standard Anthropic Messages API (streaming or non-streaming).

### POST /v1/chat/completions

Proxy OpenAI Chat Completions API requests.

**Auth:** `Authorization: Bearer sk-...` or `Authorization: Bearer sk-lli-*`.
**Request body:** Standard OpenAI Chat API JSON.
**Response:** Standard OpenAI Chat API (streaming or non-streaming).

## Data Endpoints

### GET /api/requests

List stored requests with optional filters.

**Query parameters:** `model`, `session_id`, `stop_reason`, `error_type`, `min_duration`, `max_duration`, `status_code`, `limit`, `offset`, `cursor`.

**Response:**

```json
{
  "requests": [{ ... }],
  "next_cursor": "eyJpZCI6IjEyMyJ9"
}
```

### GET /api/requests/{id}

Get a single request by ID.

### GET /api/requests/export

Export filtered requests as CSV or JSON download.

**Query parameters:** Same filters as `/api/requests`, plus `format` (csv or json).

### GET /api/sessions

List session summaries with aggregated stats.

**Response:** Array of sessions with `total_tokens`, `total_cost`, `avg_duration`, `models`, `error_count`.

### GET /api/sessions/{id}/requests

List all requests belonging to a session.

### GET /api/stats

Cost and usage statistics.

**Response:** `total_cost`, `total_tokens`, `total_requests`, `avg_latency_ms`, `p50/p95/p99 latency`, `errors_by_type`.

### GET /api/stats/timeseries

Time-aggregated metrics for charting.

**Parameters:** `from`, `to`, `granularity` (minute, hour, day).

**Response:** Array of buckets with request count, token count, cost, error count.

## Admin Endpoints

### POST /api/admin/login

Authenticate and receive a JWT token.

**Request:** `{ "username": "admin", "password": "..." }`
**Response:** `{ "token": "eyJ..." }`

### GET /api/admin/config

List all runtime config entries.

### GET /api/admin/config/{key}

Get a single config entry by key.

### PUT /api/admin/config/{key}

Create or update a config entry. Triggers plugin hot-reload.

**Request:** `{ "value": { ... JSON object ... } }`
**Auth:** Admin JWT required.

### DELETE /api/admin/config/{key}

Delete a config entry.

### GET /api/admin/audit

List audit log entries.

**Parameters:** `limit`, `offset`.

## Key Management (Router Mode)

### POST /api/keys

Generate a new API key.

**Response:** `{ "key": "sk-lli-a1b2c3...", "prefix": "sk-lli-a1b2", "id": "..." }`

### GET /api/keys

List all API keys (prefixes only, hashes hidden).

### PATCH /api/keys/{id}/disable

Revoke an API key.

## Event Stream

### GET /api/events

Server-Sent Events (SSE) live stream.

**Response:** `text/event-stream` with `data: { "type": "request_created", "payload": {...} }`

## Health

### GET /health

**Response:** `{ "status": "ok" }`
