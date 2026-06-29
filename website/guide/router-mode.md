# Router Mode

## Overview

Router mode enables multi-tenant API key management and multi-provider routing. Clients authenticate with managed keys (`sk-lli-*` prefix) instead of passing upstream keys directly.

## Enabling Router Mode

```yaml
router:
  enabled: true
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

## API Key Management

| Action | Endpoint | Description |
|--------|----------|-------------|
| Generate | `POST /api/keys` | Returns `sk-lli-*` prefixed key |
| List | `GET /api/keys` | Lists all keys (prefixes only, hashes hidden) |
| Disable | `PATCH /api/keys/{id}/disable` | Revokes a key |

Keys are hashed with bcrypt before storage. Only the key prefix (e.g., `sk-lli-a1b2`) and bcrypt hash are persisted.

## Protocol Translation

The gateway automatically translates between Anthropic and OpenAI formats:

| Feature | Anthropic → OpenAI | OpenAI → Anthropic |
|---------|-------------------|-------------------|
| Messages | System prompt → `system` role | `system`/`developer` → top-level `system` |
| Tools | `tool_use` blocks → `tool_calls` | `tool_calls` → `tool_use` blocks |
| Thinking | `thinking` block → `reasoning_content` | `reasoning_tokens` → `thinking` block |
| Streaming | SSE events → SSE chunks | SSE chunks → SSE events |

## Provider Routing

When a request arrives, the router matches the request's model name against each provider's `model_glob` pattern (glob, not regex). The first match is used for upstream forwarding.
