# Getting Started

## Prerequisites

- **Go 1.26.3+**
- **Node 24+** (for building the web UI, first time only)
- **Docker** (optional, for Docker Compose setup)

## From Source

```bash
# Clone
git clone https://github.com/chingjustwe/llm-interceptor.git
cd llm-interceptor

# Install frontend deps and build the SPA (first time only)
(cd ui && npm install && npm run build)

# Build the Go binary (embeds the SPA automatically)
go build -o llm-interceptor ./cmd/llm-interceptor/

# Run with the example config (passthrough mode)
./llm-interceptor config.example.yaml
```

## Docker Compose (one-click)

```bash
# Set your upstream API key and start
ANTHROPIC_API_KEY=sk-ant-... docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

For production-grade setups with PostgreSQL and Redis:

```bash
docker compose -f docker-compose.yml \
  -f deploy/docker-compose-pg.yml \
  -f deploy/docker-compose-redis.yml \
  up -d
```

## Verify It Works

```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

## What's Next?

- [Configuration](/guide/configuration) — tune storage, plugins, and router settings
- [Supported Providers](/guide/providers) — connect OpenAI, Anthropic, and more
- [Architecture](/guide/architecture) — understand the system design
- [Router Mode](/guide/router-mode) — enable multi-tenant API key management
