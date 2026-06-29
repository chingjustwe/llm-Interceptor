# Architecture

## System Overview

```
App ──▶ LLM Interceptor ──▶ Provider (Anthropic / OpenAI)
              │
        Plugin Pipeline
              │
     ┌────────┴────────┐
     │                 │
  Storage           State
  (SQLite/PG)    (Memory/Redis)
```

## Plugin Lifecycle

| Phase | Order | Description |
|-------|-------|-------------|
| OnRequest | OTel → ToolPolicy → RateLimit → Budget → CostTracker | Run in registration order; any plugin can block |
| Forward | N/A | Request sent to upstream; response captured |
| OnResponse | CostTracker → Budget → RateLimit → ToolPolicy → OTel | Run in **reverse** order |

CostTracker must be last in registration order (first in reverse) so it writes cost data before Budget reads it on the next request.

## Key Interfaces

### Plugin

```go
type Plugin interface {
    Name() string
    OnRequest(ctx *RequestContext) (*HookResult, error)
    OnResponse(ctx *ResponseContext) error
}
```

### Storage.Backend

```go
type Backend interface {
    SaveRequest(ctx context.Context, req *types.StoredRequest) error
    QueryRequests(ctx context.Context, filter types.RequestFilter) ([]types.StoredRequest, error)
    // ... SaveAPIKey, SaveConfig, SaveAuditEntry, etc.
    Close() error
}
```

### State.Backend

```go
type Backend interface {
    Increment(ctx context.Context, key string, delta int64) (int64, error)
    Get(ctx context.Context, key string) (int64, error)
    Reset(ctx context.Context, key string) error
    Close() error
}
```

## Design Principles

- **Forward path never blocked**: OTel export, state updates, and metrics collection are async
- **Metadata map**: `RequestContext.Metadata` is the inter-plugin communication channel
- **Interface-abstracted**: Storage and State backends are swappable at config time
- **Dual mode**: Passthrough (default) vs Router (managed keys)
