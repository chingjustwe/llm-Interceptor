# Phase 1 — Foundation: Engineering Implementation Spec

## Overview

Phase 1 delivers the data and protocol foundation that all downstream phases depend on. It has two parallel tracks:

| Track | Focus | Dependencies |
|-------|-------|-------------|
| **A** | Enhanced Data Capture | — |
| **B** | OpenAI Chat Completions API | — |

Both tracks share a storage schema migration. They can be developed in parallel but must be integrated before Phase 2.

---

## Track A — Enhanced Data Capture

### Goal

Extract structured fields from LLM request/response bodies that are currently buried in JSON blobs, enabling server-side filtering, aggregation, and richer UI in Phase 2.

### Data Model Changes

#### `types.StoredRequest` — new fields

```go
type StoredRequest struct {
    // ... existing fields (ID, SessionID, Model, Method, Path, etc.)

    // New independent columns (queryable/filterable)
    SystemPrompt    *string `json:"system_prompt,omitempty"`      // extracted system prompt
    StopReason      *string `json:"stop_reason,omitempty"`        // end_turn, max_tokens, tool_use, etc.
    ErrorType       *string `json:"error_type,omitempty"`         // upstream error type (invalid_request_error, rate_limit_error, etc.)
    ErrorMessage    *string `json:"error_message,omitempty"`      // upstream error message
    TTFTMs          *int64  `json:"ttft_ms,omitempty"`            // time-to-first-token (ms)
    Temperature     *float64 `json:"temperature,omitempty"`        // request temperature
    TopP            *float64 `json:"top_p,omitempty"`              // request top_p

    // New JSON column — all remaining request config params
    RequestParams   *string `json:"request_params,omitempty"`     // JSON: {max_tokens, top_k, stop_sequences, tool_choice, response_format, seed, user, metadata, thinking, service_tier, frequency_penalty, presence_penalty, ...}
}
```

Use `*string` / `*float64` / `*int64` (pointer types) for all new fields so they can be `nil` when unavailable vs. zero-value. The JSON output omits nil fields via `omitempty`.

#### `RequestFilter` — new filterable fields

```go
type RequestFilter struct {
    // ... existing fields (SessionID, Model, From, To, Limit, Offset)

    StopReason  *string  // filter by stop reason
    ErrorType   *string  // filter non-null error_type
    MinDuration *int64   // min duration_ms
    MaxDuration *int64   // max duration_ms
    StatusCodes []int    // filter by one or more status codes
}
```

### Storage Schema Migration

#### SQLite (`internal/storage/sqlite.go`)

Add `ALTER TABLE` statements in `NewSQLite`, guarded by a schema version check:

```sql
ALTER TABLE requests ADD COLUMN system_prompt TEXT;
ALTER TABLE requests ADD COLUMN stop_reason TEXT;
ALTER TABLE requests ADD COLUMN error_type TEXT;
ALTER TABLE requests ADD COLUMN error_message TEXT;
ALTER TABLE requests ADD COLUMN ttft_ms INTEGER;
ALTER TABLE requests ADD COLUMN temperature REAL;
ALTER TABLE requests ADD COLUMN top_p REAL;
ALTER TABLE requests ADD COLUMN request_params TEXT;
```

Add index:
```sql
CREATE INDEX IF NOT EXISTS idx_requests_stop_reason ON requests(stop_reason);
CREATE INDEX IF NOT EXISTS idx_requests_error_type ON requests(error_type);
```

#### PostgreSQL (`internal/storage/postgres.go`)

Same columns but with PG syntax:

```sql
ALTER TABLE requests ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS stop_reason TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS error_type TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS ttft_ms INTEGER;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS top_p DOUBLE PRECISION;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS request_params TEXT;
CREATE INDEX IF NOT EXISTS idx_requests_stop_reason ON requests(stop_reason);
CREATE INDEX IF NOT EXISTS idx_requests_error_type ON requests(error_type);
```

**Migration strategy**: Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for PG (safe to re-run). For SQLite, use a `PRAGMA user_version` counter:

```go
var version int
s.db.QueryRow("PRAGMA user_version").Scan(&version)
if version < 1 {
    // run migration SQL
    s.db.Exec("PRAGMA user_version = 1")
}
```

### Proxy Changes — Data Extraction

#### A. Request params extraction

In `internal/proxy/proxy.go`, add a new function `ExtractRequestParams(body []byte) map[string]any` that parses the request body and extracts all config parameters (excluding `messages` and `stream`):

```go
// ExtractRequestParams extracts request configuration parameters from the
// request body, excluding the messages array. Returns a flat JSON-serializable
// map suitable for the request_params column.
func ExtractRequestParams(body []byte) map[string]any {
    var raw map[string]any
    if err := json.Unmarshal(body, &raw); err != nil {
        return nil
    }
    // Remove messages and stream — not config params
    delete(raw, "messages")
    delete(raw, "stream")
    delete(raw, "model")  // already stored separately
    return raw
}
```

Also extract typed values for independent columns:
- `Temperature`: `raw["temperature"].(float64)` 
- `TopP`: `raw["top_p"].(float64)`
- `SystemPrompt`: from Anthropic top-level `system` field or OpenAI `system`/`developer` role messages

#### B. System prompt extraction

Extract from Anthropic format: top-level `system` field.
Extract from OpenAI format: first message with `role: "system"` or `role: "developer"`.

```go
func ExtractSystemPrompt(body []byte) *string {
    var raw struct {
        System  *string `json:"system,omitempty"`
        Messages []json.RawMessage `json:"messages"`
    }
    if err := json.Unmarshal(body, &raw); err != nil {
        return nil
    }
    if raw.System != nil {
        return raw.System
    }
    // Check OpenAI system/developer role messages
    for _, m := range raw.Messages {
        var msg struct {
            Role    string `json:"role"`
            Content string `json:"content"`
        }
        if json.Unmarshal(m, &msg) == nil && (msg.Role == "system" || msg.Role == "developer") {
            return &msg.Content
        }
    }
    return nil
}
```

#### C. Latency breakdown — TTFT

Modify `HandleRequestStream` to record the time from request start to the first `content_block_delta` event (Anthropic) or first `delta.content` chunk (OpenAI).

Add `TTFTMs` to the function's return values. Track elapsed ms from `start` to the first buffered event that contains content.

The existing `collectSSE` function should be modified to also track TTFT — or create a new `StreamCollector` that records this.

**Approach**: Add a `ttftMs int64` field to `collectSSE`'s return values. Within the SSE parsing loop, on the first meaningful content event (Anthropic: `content_block_start` type=text or type=tool_use; OpenAI: `choices[0].delta.content` or `choices[0].delta.tool_calls`), record `time.Since(start).Milliseconds()`. Only set once per stream.

#### D. Structured error tracking

Modify `HandleRequest` and `HandleRequestStream` to parse upstream error responses. When `StatusCode >= 400`, extract `error.type` and `error.message` from the response body.

Both Anthropic and OpenAI use the same error shape at the top level:
- Anthropic: `{"type":"error","error":{"type":"invalid_request_error","message":"..."}}`
- OpenAI: `{"error":{"type":"invalid_request_error","message":"...","code":null}}`

Add error extraction function:

```go
func ExtractError(body []byte) (errorType, errorMessage string) {
    var raw struct {
        Error struct {
            Type    string `json:"type"`
            Message string `json:"message"`
        } `json:"error"`
    }
    if err := json.Unmarshal(body, &raw); err != nil {
        return "", ""
    }
    if raw.Error.Type != "" {
        return raw.Error.Type, raw.Error.Message
    }
    // Try nested Anthropic format
    var anthropicRaw struct {
        Type  string `json:"type"`
        Error struct {
            Type    string `json:"type"`
            Message string `json:"message"`
        } `json:"error"`
    }
    if err := json.Unmarshal(body, &anthropicRaw); err != nil {
        return "", ""
    }
    return anthropicRaw.Error.Type, anthropicRaw.Error.Message
}
```

### API Changes

#### `GET /api/requests` — new filter query params

| Param | Type | Description |
|-------|------|-------------|
| `stop_reason` | string | Filter by stop reason (e.g. `end_turn`, `tool_use`) |
| `error_type` | string | Filter by error type (e.g. `rate_limit_error`) |
| `min_duration` | int | Minimum duration in ms |
| `max_duration` | int | Maximum duration in ms |
| `status_code` | int (repeatable) | Filter by status code, e.g. `?status_code=200&status_code=429` |

#### `GET /api/requests/{id}` — new response fields

The response now includes all new `StoredRequest` fields: `system_prompt`, `stop_reason`, `error_type`, `error_message`, `ttft_ms`, `temperature`, `top_p`, `request_params`.

#### `GET /api/stats` — enhanced response

Add error rate stats:
```json
{
  "daily_cost": 0.42,
  "total_cost": 12.34,
  "total_requests": 500,
  "total_tokens": 123456,
  "error_rate": 0.02,
  "error_counts": {
    "rate_limit_error": 5,
    "invalid_request_error": 3,
    "api_error": 2
  },
  "per_model": [
    { "model": "claude-sonnet-4-6", "requests": 300, "tokens": 80000, "cost_usd": 9.50, "error_rate": 0.01 }
  ]
}
```

### Files Changed (Track A)

| File | Change |
|------|--------|
| `internal/types/types.go` | Add new fields to `StoredRequest` and `RequestFilter` |
| `internal/proxy/proxy.go` | Add `ExtractRequestParams`, `ExtractSystemPrompt`, `ExtractError`, modify `HandleRequest` to populate new fields |
| `internal/proxy/streaming.go` | Add TTFT tracking to `collectSSE`; modify return signature |
| `internal/storage/sqlite.go` | Schema migration, add new columns in INSERT/SELECT/Scan |
| `internal/storage/postgres.go` | Same migration + query changes |
| `internal/storage/interface.go` | No change needed (interface methods are already generic) |
| `internal/api/handler.go` | Add new filter params to `listRequests`, enhance `costStats` with error rate data |

---

## Track B — OpenAI Chat Completions API

### Goal

Add full OpenAI `/v1/chat/completions` endpoint support in both passthrough and router modes, with complete bidirectional protocol translation (including streaming, tools, and thinking/reasoning).

### Unified Dispatch Architecture

#### Route registration (`cmd/llm-interceptor/main.go`)

Both paths route to the same handler:

```go
r.Post("/v1/messages", h.handleLLMRequest)
r.Post("/v1/chat/completions", h.handleLLMRequest)
```

#### Handler changes (`internal/api/handler.go`)

Introduce a new `handleLLMRequest` method that detects the API format from `r.URL.Path`:

```go
type APIFormat int
const (
    FormatAnthropic APIFormat = iota
    FormatOpenAI
)

func (h *Handler) handleLLMRequest(w http.ResponseWriter, r *http.Request) {
    format := FormatAnthropic
    if r.URL.Path == "/v1/chat/completions" {
        format = FormatOpenAI
    }
    // ... rest of the handler, passing format through context
}
```

Set the format in `plugin.RequestContext` (via a new field or metadata), so plugins know what format the original request used.

### Plugin Context Changes

Add a new field to `plugin.RequestContext`:

```go
type RequestContext struct {
    // ... existing fields
    APIFormat string  // "anthropic" or "openai"
}
```

Same for `ResponseContext` or pass through metadata.

### Proxy Changes — Path-Agnostic Forwarding

#### `Proxy.HandleRequest` and `Proxy.HandleRequestStream`

Currently hardcode the upstream path as `/v1/messages`. Change to accept the path as a parameter:

```go
func (p *Proxy) HandleRequest(body []byte, headers map[string]string, path string) (*PluginResponse, error) {
    req, err := http.NewRequest("POST", p.upstream+path, bytes.NewReader(body))
    // ...
}

func (p *Proxy) HandleRequestStream(body []byte, headers map[string]string, w http.ResponseWriter, path string, isToolBlocked func(name string) bool) (...) {
    req, err := http.NewRequest("POST", p.upstream+path, bytes.NewReader(body))
    // ...
}
```

The path is derived from the incoming request's URL path. In router mode, the provider's base URL + the original path is used.

### Protocol Translation Enhancements

#### `internal/translate/openai.go` — current state

Currently only handles non-streaming text-only responses. Missing:
- Tool call translation
- Streaming SSE translation
- Thinking/reasoning content mapping
- Cache control / usage details

#### `internal/translate/anthropic.go` — current state

Currently only handles text-only messages. Missing:
- Tool definitions (`tools[]`) translation
- `tool_choice` translation
- Multimodal content (images)
- Streaming support

#### Request translation — complete rewrite

**Anthropic → OpenAI**: Move to `translate/anthropic.go` (or a shared file).

Full mapping:

| Anthropic Field | OpenAI Field |
|----------------|--------------|
| `model` | `model` |
| `messages[]` | `messages[]` (see role mapping below) |
| `system` | Prepended as `{role:"system", content}` message |
| `max_tokens` | `max_completion_tokens` |
| `stream` | `stream` |
| `temperature` | `temperature` |
| `top_p` | `top_p` |
| `top_k` | not supported by OpenAI (drop) |
| `stop_sequences` | `stop` |
| `tools[]` | `tools[]` (map `input_schema` → `function.parameters`) |
| `tool_choice` | `tool_choice` (map `"any"` → `"required"`) |
| `metadata.user_id` | `user` |
| `thinking` | Not directly supported — set `reasoning_effort` approximation or drop |
| `output_config.format` | `response_format` |

**Role mapping**:
| Anthropic | OpenAI |
|-----------|--------|
| `user` (text) | `user` (text) |
| `user` (tool_result) | `tool` |
| `assistant` | `assistant` |
| `system` (top-level) | `system` |

**OpenAI → Anthropic**: Move to `translate/openai.go` (or a shared file).

Full mapping:

| OpenAI Field | Anthropic Field |
|-------------|----------------|
| `model` | `model` |
| `messages[]` | `messages[]` (see role mapping) |
| `max_completion_tokens` / `max_tokens` | `max_tokens` |
| `stream` | `stream` |
| `temperature` | `temperature` |
| `top_p` | `top_p` |
| `stop` | `stop_sequences` |
| `tools[]` | `tools[]` (map `function.parameters` → `input_schema`) |
| `tool_choice` | `tool_choice` |
| `response_format` | `output_config.format` |
| `user` | `metadata.user_id` |
| `frequency_penalty` / `presence_penalty` | Not supported (drop) |

#### Response translation — complete rewrite

**OpenAI → Anthropic** (sync):

| OpenAI Response | Anthropic Response |
|----------------|--------------------|
| `choices[0].message.content` + `choices[0].message.tool_calls` | `content[]` with text + tool_use blocks |
| `finish_reason: "stop"` → `stop_reason: "end_turn"` | |
| `finish_reason: "length"` → `stop_reason: "max_tokens"` | |
| `finish_reason: "tool_calls"` → `stop_reason: "tool_use"` | |
| `finish_reason: "content_filter"` → `stop_reason: "refusal"` | |
| `usage.prompt_tokens` → `usage.input_tokens` | |
| `usage.completion_tokens` → `usage.output_tokens` | |
| `usage.prompt_tokens_details.cached_tokens` → `usage.cache_read_input_tokens` | |
| `usage.completion_tokens_details.reasoning_tokens` → included in `output_tokens` | |

**Anthropic → OpenAI** (sync):

| Anthropic Response | OpenAI Response |
|--------------------|----------------|
| `content[]` text blocks → `choices[0].message.content` | |
| `content[]` tool_use blocks → `choices[0].message.tool_calls[]` | |
| `stop_reason: "end_turn"` → `finish_reason: "stop"` | |
| `stop_reason: "max_tokens"` → `finish_reason: "length"` | |
| `stop_reason: "tool_use"` → `finish_reason: "tool_calls"` | |
| `stop_reason: "refusal"` → `finish_reason: "content_filter"` | |
| `usage.input_tokens` → `usage.prompt_tokens` | |
| `usage.output_tokens` → `usage.completion_tokens` | |
| `usage.cache_read_input_tokens` → `usage.prompt_tokens_details.cached_tokens` | |
| `usage.cache_creation_input_tokens` → not in OpenAI (drop) | |

### Streaming SSE Translation — New Package

Create `internal/translate/streaming.go` with bidirectional streaming translation.

#### StreamCollector interface

```go
// SSEEvent is a single parsed SSE event from any provider.
type SSEEvent struct {
    Event string // "message_start", "content_block_delta", "data: [DONE]", etc.
    Data  json.RawMessage
}

// StreamParser parses raw SSE lines from an upstream provider.
type StreamParser interface {
    ParseEvent(line string) (*SSEEvent, bool) // bool = is this a complete event?
}

// StreamTranslator converts parsed events between protocols.
type StreamTranslator interface {
    TranslateAnthropicToOpenAI(event *SSEEvent) []SSEEvent  // can produce 0..N events
    TranslateOpenAIToAnthropic(event *SSEEvent) []SSEEvent
}
```

#### Anthropic → OpenAI streaming chunk mapping

| Anthropic Event → | OpenAI Chunks (multiple `data: {...}\n\n`) |
|---|---|
| `message_start {message:{role, content[], ...}}` | 1. `choices[0].delta={role:"assistant"}` |
| `content_block_start {index:0, content_block:{type:"text"}}` → `content_block_delta {text_delta, text:"..."}` + `content_block_stop` | 2..N. `choices[0].delta={content:"..."}` |
| `content_block_start {index, content_block:{type:"tool_use", id, name}}` | `choices[0].delta={tool_calls:[{index, id, type:"function", function:{name}}]}` |
| `content_block_delta {input_json_delta, partial_json}` | `choices[0].delta={tool_calls:[{index, function:{arguments:"partial"}}]}` |
| `message_delta {delta:{stop_reason:"end_turn"}, usage:{output_tokens}}` | Final chunk `choices[0].delta={}, finish_reason:"stop"` + usage in `stream_options: {"include_usage": true}` format |
| `message_stop` | No event (stream done) |

#### OpenAI → Anthropic streaming chunk mapping

| OpenAI Chunk → | Anthropic Events |
|---|---|
| `choices[0].delta={role:"assistant"}` | `message_start {message:{role:"assistant"}}` |
| `choices[0].delta={content:"..."}` | `content_block_start {type:"text"}` + `content_block_delta {text_delta}` (accumulate text) |
| `choices[0].delta={tool_calls:[{id, function:{name}}]}` | `content_block_start {type:"tool_use", id, name}` |
| `choices[0].delta={tool_calls:[{function:{arguments}}]}` | `content_block_delta {input_json_delta}` |
| `choices[0].finish_reason:"..."` | `message_delta {delta:{stop_reason:"..."}, usage:{...}}` |
| `[DONE]` | `message_stop` |

#### Thinking/Reasoning content

For Anthropic → OpenAI:
- Anthropic `content_block_start {type:"thinking"}` → OpenAI `choices[0].delta={reasoning_content:"..."}` (OpenAI extension field)
- Anthropic `thinking_delta` → OpenAI `reasoning_content` delta
- Account for thinking tokens in usage (Anthropic includes them in `output_tokens` already; OpenAI reports them separately as `completion_tokens_details.reasoning_tokens`)

For OpenAI → Anthropic:
- If `reasoning_content` is present in delta, emit Anthropic `content_block_start {type:"thinking"}` and subsequent `thinking_delta` events
- Map `completion_tokens_details.reasoning_tokens` to Anthropic output_tokens (Anthropic already counts them there)

### Proxy Streaming — Format-Agnostic Collector

Modify `collectSSE` to work with both formats, or create a new `collectSSEDual` function:

The key insight: the streaming translation must happen **after** collecting SSE for metadata, but the client should see the original format. However, with tool blocking, the response needs to be translated.

**Design decision**: The proxy should keep the stream in the original format until tool blocking is resolved, then:
- If no tool blocking: forward the translated stream to the client
- If tool blocking: collect full response, build follow-up, translate the final response

For simplicity in Phase 1, the streaming collector remains Anthropic-specific. OpenAI streaming in router mode follows a different path:

```
Incoming OpenAI stream → translate request to Anthropic → proxy forward
→ collect Anthropic SSE → translate events back to OpenAI chunks → write to client
```

In passthrough mode, OpenAI streaming is direct passthrough (no translation needed).

### Cross-Protocol Routing

In `internal/router/`, the `SelectProvider` already selects by model glob. Add protocol negotiation:

```go
type Protocol string
const (
    ProtocolAnthropic Protocol = "anthropic"
    ProtocolOpenAI    Protocol = "openai"
)

// NegotiatedRoute holds the selected provider and whether translation is needed.
type NegotiatedRoute struct {
    Provider     *ProviderConfig
    InboundProtocol  Protocol  // the original request format
    OutboundProtocol Protocol  // the upstream provider's format
    NeedsTranslation bool     // inbound != outbound
}
```

If `NeedsTranslation`, the proxy translates:
- Before forwarding: translate request body
- After receiving response: translate response body
- For streaming: translate each SSE event/chunk

### Files Changed (Track B)

| File | Change |
|------|--------|
| `cmd/llm-interceptor/main.go` | Register `/v1/chat/completions` route, provide API format to handler |
| `internal/api/handler.go` | New `handleLLMRequest` function, format detection |
| `internal/plugin/interface.go` | Add `APIFormat` to `RequestContext` / `ResponseContext` |
| `internal/proxy/proxy.go` | Modify `HandleRequest` signature to accept `path` param |
| `internal/proxy/streaming.go` | Modify `HandleRequestStream` to accept `path`; TTFT tracking |
| `internal/translate/anthropic.go` | Full Anthropic→OpenAI request translation (tools, streaming) |
| `internal/translate/openai.go` | Full OpenAI→Anthropic request translation (tools, streaming) |
| `internal/translate/streaming.go` | **New** — bidirectional streaming SSE translation |
| `internal/translate/translate_test.go` | Update tests for new functionality |
| `internal/router/router.go` | Add protocol negotiation, `NegotiatedRoute` struct |

### Architecture: Translation Flow Diagrams

#### Passthrough mode, Anthropic upstream

```
Client ──POST /v1/messages──→ Handler ──→ Plugins ──→ Proxy (path=/v1/messages) ──→ Anthropic
                                                                                    │
Client ←── original format ── Handler ←── Plugins ←── Proxy (no translation needed)
```

#### Passthrough mode, OpenAI upstream

```
Client ──POST /v1/chat/completions──→ Handler ──→ Plugins ──→ Proxy (path=/v1/chat/completions) ──→ OpenAI
                                                                                                    │
Client ←── original format ── Handler ←── Plugins ←── Proxy (no translation needed)
```

#### Router mode, cross-protocol (Anthropic → OpenAI provider)

```
Client ──POST /v1/messages──→ Handler ──→ Plugins (see Anthropic format)
                                          │
                                          ├── Router: SelectProvider("gpt-4o") → OpenAI
                                          │
                                          ↓
                                   Translate ToOpenAI(request body)
                                          │
                                          ↓
                                   Proxy (path=/v1/chat/completions) ──→ OpenAI
                                                                          │
                                   Translate ToAnthropic(response body) ←──┘
                                          │
                                          ↓
                                   Plugins (reverse, still see Anthropic format via metadata)
                                          │
Client ←── original Anthropic format ←───┘
```

#### Router mode, cross-protocol streaming (OpenAI → Anthropic provider)

```
Client ──POST /v1/chat/completions (stream=true)──→ Handler
                                                    │
                                                    ├── Router: SelectProvider("claude-sonnet-4") → Anthropic
                                                    │
                                                    ↓
                                             Translate ToAnthropic(request body)
                                                    │
                                                    ↓
                                             Proxy streaming (path=/v1/messages) ──→ Anthropic SSE events
                                                                                      │
                                             TranslateStream Anthropic→OpenAI chunks ←──┘
                                                    │
Client ←── OpenAI streaming chunks ←── SSE writer ←┘
```

---

## Testing Strategy

### Track A Tests

| Test | What | File |
|------|------|------|
| `TestExtractRequestParams` | Verify extraction filters out messages/stream/model; includes temperature, top_p, tools | `internal/proxy/proxy_test.go` |
| `TestExtractSystemPrompt` | Anthropic top-level system, OpenAI system/developer role | `internal/proxy/proxy_test.go` |
| `TestExtractError` | Both Anthropic and OpenAI error formats | `internal/proxy/proxy_test.go` |
| `TestTTFTTracking` | Mock SSE stream, verify TTFT is set on first content event | `internal/proxy/streaming_test.go` |
| `TestRequestFilter_NewFields` | Verify StopReason/ErrorType/StatusCodes filters in SQLite and PG | `internal/storage/*_test.go` |

### Track B Tests

| Test | What | File |
|------|------|------|
| `TestToOpenAI_Request_Full` | Anthropic request with tools, thinking, system → full OpenAI request | `internal/translate/anthropic_test.go` |
| `TestToAnthropic_Request_Full` | OpenAI request with tools, response_format, user → full Anthropic request | `internal/translate/openai_test.go` |
| `TestToAnthropic_Response_ToolCalls` | OpenAI response with tool_calls → Anthropic response with tool_use blocks | `internal/translate/openai_test.go` |
| `TestToOpenAI_Response_ToolCalls` | Anthropic response with tool_use → OpenAI response with tool_calls | `internal/translate/anthropic_test.go` |
| `TestStreamTranslate_AnthropicToOpenAI` | Series of Anthropic SSE events → OpenAI chunks | `internal/translate/streaming_test.go` |
| `TestStreamTranslate_OpenAIToAnthropic` | Series of OpenAI chunks → Anthropic SSE events | `internal/translate/streaming_test.go` |
| `TestStreamTranslate_Thinking` | Thinking block translation both directions | `internal/translate/streaming_test.go` |
| `TestCrossProtocolRouting` | Router selects different protocol → translation happens | `internal/router/router_test.go` |
| `TestEndpointV1ChatCompletions` | Full HTTP test: POST /v1/chat/completions → upstream mock → correct response | `internal/api/handler_test.go` |

---

## Implementation Order (Recommended)

The tasks within each track are listed by dependency. Both tracks can run in parallel with separate PRs.

### Track A Sequence

| Step | Task | Depends On |
|------|------|------------|
| A1 | Add new fields to `types.StoredRequest` and `RequestFilter` | — |
| A2 | Schema migration: SQLite + PG `ALTER TABLE` | A1 |
| A3 | `ExtractRequestParams`, `ExtractSystemPrompt`, `ExtractError` in proxy | — |
| A4 | Modify `HandleRequest` to populate new fields from request/response | A1, A3 |
| A5 | TTFT tracking in `collectSSE` → `HandleRequestStream` | — |
| A6 | Update storage layer INSERT/SELECT to include new columns | A2, A4 |
| A7 | Update API handler: new filter params, enhanced stats response | A6 |
| A8 | Tests for all proxy extraction functions | A3-A5 |
| A9 | Integration test: end-to-end proxy → storage → API | A6-A7 |

### Track B Sequence

| Step | Task | Depends On |
|------|------|------------|
| B1 | Add `APIFormat` to plugin context | — |
| B2 | Modify `Proxy.HandleRequest/HandleRequestStream` to accept path param | — |
| B3 | Complete Anthropic→OpenAI request translation (tools, all fields) | B1 |
| B4 | Complete OpenAI→Anthropic request translation (tools, all fields) | B1 |
| B5 | Response translation: OpenAI→Anthropic (tool_calls, usage details) | — |
| B6 | Response translation: Anthropic→OpenAI (tool_use, stop_reason mapping) | — |
| B7 | `internal/translate/streaming.go` — bidirectional SSE translation | B3-B6 |
| B8 | Thinking/reasoning content translation | B7 |
| B9 | Register `/v1/chat/completions` route + unified `handleLLMRequest` | B2 |
| B10 | Router protocol negotiation (`NegotiatedRoute`) | — |
| B11 | Cross-protocol streaming: translate request → proxy → translate stream → client | B7, B10 |
| B12 | Integration test: `/v1/chat/completions` end-to-end | B9 |

---

## Acceptance Criteria

All must pass before Phase 1 is considered complete:

1. `go build ./... && go vet ./... && go test ./... -v` ✅ all green
2. New fields appear in `GET /api/requests/{id}` response for both Anthropic and OpenAI requests
3. `GET /api/requests?stop_reason=tool_use` correctly filters results
4. `POST /v1/chat/completions` in passthrough mode returns valid OpenAI response
5. An Anthropic streaming request routed to OpenAI provider translates SSE events correctly and returns valid Anthropic response to client
6. An OpenAI streaming request routed to Anthropic provider translates SSE chunks correctly and returns valid OpenAI response to client
7. Tool calls survive translation: Anthropic tool_use ↔ OpenAI tool_calls (sync and streaming)
8. Migration is idempotent: re-running on an existing database does not error
9. Cost tracker correctly calculates costs for both Anthropic and OpenAI requests
