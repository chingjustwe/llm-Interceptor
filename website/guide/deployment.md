# Deployment

## Quick Start (Docker Compose)

```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose up -d
```

## Production (Docker Compose)

Use the overlay files for PostgreSQL, Redis, and OpenTelemetry:

```bash
docker compose -f docker-compose.yml \
  -f deploy/docker-compose-pg.yml \
  -f deploy/docker-compose-redis.yml \
  up -d
```

| Compose File | Adds |
|---|---|
| `deploy/docker-compose-pg.yml` | PostgreSQL 16 |
| `deploy/docker-compose-redis.yml` | Redis 7 |
| `deploy/docker-compose-otel.yml` | OpenTelemetry Collector |

## Environment Variables

Set in `.env` alongside `docker-compose.yml`:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
```

## Volume Mounts

Mount volumes for persistent SQLite data and custom config:

```yaml
volumes:
  - ./data:/root/.llm-interceptor
  - ./config.yaml:/etc/llm-interceptor/config.yaml
```

## Reverse Proxy

### nginx (with SSE support)

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_buffering off;
    proxy_cache off;
}
```

### Caddy (with SSE support)

```
llm.example.com {
    reverse_proxy 127.0.0.1:8080 {
        flush_interval -1
    }
}
```

## Monitoring

- `GET /health` — health check
- `GET /metrics` — Prometheus metrics (Go runtime + request metrics)
- Structured JSON logs via `log.format: json`
