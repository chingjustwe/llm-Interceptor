# Configuration

LLM Interceptor uses a single YAML configuration file. All settings are optional — sensible defaults are provided for every value.

## Minimal Config

```yaml
listen: "127.0.0.1:8080"
upstream: "https://api.anthropic.com"
```

## Server

| Field | Default | Description |
|-------|---------|-------------|
| `listen` | `127.0.0.1:8080` | Bind address and port |
| `upstream` | `https://api.anthropic.com` | Upstream LLM base URL |
| `metric_prefix` | `llm_proxy.` | Metrics prefix for OTel and Prometheus |
| `shutdown_timeout_sec` | `10` | Graceful shutdown timeout |

## Admin

```yaml
admin:
  username: "admin"
  password: ""          # bcrypt hashed; auto-generated if empty on first run
  jwt_secret: ""        # auto-generated if empty on first run
```

## Log

```yaml
log:
  format: json           # json or text
  level: info            # debug, info, warn, error
  output: stdout         # stdout or file path
  request_body: false    # log request bodies (can be large)
  response_body: false   # log response bodies (can be large)
```

## Storage

```yaml
storage:
  type: sqlite
  sqlite:
    path: "~/.llm-interceptor/data.db"
  # type: postgres
  # postgres:
  #   connection_string: "postgres://user:pass@localhost:5432/llmproxy?sslmode=disable"
  compression:
    enabled: true
    algorithm: gzip
    min_size: 1024
```

## State Store

```yaml
state_store:
  type: memory
  # type: redis
  # redis:
  #   url: "redis://:password@localhost:6379/0"
```

## Plugins

```yaml
plugins:
  otel-exporter:
    enabled: false
    endpoint: "localhost:4318"
  cost-tracker:
    enabled: true
  budget:
    max_cost_per_session: 0.50
    max_cost_per_day: 0
  rate-limit:
    requests_per_minute: 60
    tokens_per_minute: 0
  tool-policy:
    blocked_tools: []
    allowed_tools: []
```

## Router

```yaml
router:
  enabled: false
  providers:
    - name: anthropic
      base_url: "https://api.anthropic.com"
      model_glob: "claude-*"
      api_key: "${ANTHROPIC_API_KEY}"
    - name: openai
      base_url: "https://api.openai.com"
      model_glob: "gpt-*"
      api_key: "${OPENAI_API_KEY}"
```

## Alerting

```yaml
# alerting:
#   slack_webhook_url: "https://hooks.slack.com/services/..."
#   rules:
#     - name: "high-error-rate"
#       metric: "error_rate"
#       threshold: 0.1
#       duration: "5m"
#       channels: ["slack"]
#       severity: "critical"
```

## Runtime Overlay

Config values stored in the `runtime_config` database table override YAML at startup. Use the Admin API (`PUT /api/admin/config/{key}`) to update settings without restarting.
