# Supported Providers

## Anthropic (Claude)

| Setting | Value |
|---------|-------|
| Base URL | `https://api.anthropic.com` |
| API Key | `ANTHROPIC_API_KEY` |
| Supported APIs | Messages API (`/v1/messages`) |
| Models | `claude-*` |

## OpenAI (GPT)

| Setting | Value |
|---------|-------|
| Base URL | `https://api.openai.com` |
| API Key | `OPENAI_API_KEY` |
| Supported APIs | Chat Completions (`/v1/chat/completions`) |
| Models | `gpt-*` |

## Passthrough Mode

Forward all requests to a single upstream:

```yaml
upstream: "https://api.anthropic.com"
```

## Router Mode

Auto-detect provider from API key prefix (`sk-lli-*`) and route by model name:

```yaml
router:
  enabled: true
  providers:
    - name: anthropic
      base_url: "https://api.anthropic.com"
      model_glob: "claude-*"
      api_key: "${ANTHROPIC_API_KEY}"
```

## Adding Custom Providers

Any OpenAI-compatible API can be added as a provider. Set `base_url` to the API endpoint and use `model_glob` to match model names.

## Environment Variables

Use `${VAR_NAME}` syntax in config values to reference environment variables at runtime.
