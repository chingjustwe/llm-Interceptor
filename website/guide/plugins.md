# Plugins

## Built-In Plugins

### OTel Exporter

Creates OpenTelemetry spans using `gen_ai.*` semantic conventions. Exports traces and metrics via OTLP.

| Config | Default | Description |
|--------|---------|-------------|
| `endpoint` | `localhost:4318` | OTLP HTTP endpoint |
| `headers` | `{}` | Custom headers for OTLP export |
| `max_attr_len` | `65535` | Max attribute value length |

### Cost Tracker

Calculates token usage and cost per model. Writes running totals to the state store.

Pricing covers: Claude 3/4 series, GPT-4o, GPT-4o-mini, GPT-4.1, with cache read/write and reasoning token pricing.

### Budget

Enforces per-session and per-day cost limits. Blocks requests when exceeded.

| Config | Default | Description |
|--------|---------|-------------|
| `max_cost_per_session` | `0.50` | Max USD per session; 0 = unlimited |
| `max_cost_per_day` | `0` | Max USD per day; 0 = unlimited |

### Rate Limit

Enforces requests-per-minute and tokens-per-minute limits. Returns `429` with `Retry-After` header.

| Config | Default | Description |
|--------|---------|-------------|
| `requests_per_minute` | `60` | Max requests per minute; 0 = unlimited |
| `tokens_per_minute` | `0` | Max tokens per minute; 0 = unlimited |

### Tool Policy

Allowlist or blocklist of tool names. Blocks requests containing disallowed tools.

| Config | Description |
|--------|-------------|
| `blocked_tools` | Tools that are forbidden |
| `allowed_tools` | Only these tools are permitted (empty = all allowed) |

## Writing Custom Plugins

1. Implement `plugin.Plugin` interface
2. Optionally implement `plugin.ConfigReloader` for live config updates
3. Register in `main.go` via `dispatcher.Register()`

```go
type MyPlugin struct {}

func (p *MyPlugin) Name() string { return "my-plugin" }

func (p *MyPlugin) OnRequest(ctx *plugin.RequestContext) (*plugin.HookResult, error) {
    return nil, nil // pass through
}

func (p *MyPlugin) OnResponse(ctx *plugin.ResponseContext) error {
    return nil
}
```

## HookResult

| Field | Description |
|-------|-------------|
| `Block` | If true, the request is rejected |
| `Reason` | Human-readable block reason |
| `StatusCode` | HTTP status code to return (e.g., 429, 402) |
| `ErrorType` | Error type string (e.g., `rate_limit_error`) |
| `RetryAfterSec` | Seconds to suggest before retry |
