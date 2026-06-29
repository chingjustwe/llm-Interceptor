---
layout: home

title: LLM Interceptor
titleTemplate: Local-first LLM Gateway

hero:
  name: LLM Interceptor
  text: Local-first, open-source LLM gateway
  tagline: |
    Transparent proxy · OpenTelemetry observability · Governance (budget/rate-limit/tool-policy)
    Multi-provider routing · Protocol translation (Anthropic ↔ OpenAI) · React SPA dashboard
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/chingjustwe/llm-interceptor

features:
  - title: Transparent Proxy
    details: Drop-in replacement for Anthropic Messages API and OpenAI Chat API. Works with Claude Code, Cline, OpenCode, and any SDK.
    icon:
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'
  - title: Plugin Architecture
    details: Extend behavior via Go interfaces — OTel, cost tracking, rate limiting, tool policies. Forward path never blocked.
    icon:
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
  - title: Observability
    details: OpenTelemetry traces and metrics. Prometheus endpoints. Token usage, latency (TTFT, P50/P95/P99), error rates, active requests.
    icon:
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>'
  - title: Governance
    details: Per-key budgets, rate limiting (RPM/TPM), tool-use policies. Best-effort alerting via Slack, Webhook, or Email.
    icon:
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
  - title: LLM Router
    details: Auto-detect provider from API key prefix (sk-lli-*). Multi-tenant key management with bcrypt. Bidirectional protocol translation.
    icon:
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  - title: Web UI
    details: React SPA with dashboards for requests, sessions, cost analytics, error analysis, and admin console. SSE live events. Export to CSV/JSON.
    icon:
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
  - title: Protocol Translation
    details: Full bidirectional Anthropic ↔ OpenAI. Streaming SSE translation, tool calls, thinking blocks, system prompt mapping.
    icon:
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>'
  - title: Single Binary
    details: One Go binary. SQLite or PostgreSQL. In-memory or Redis. Docker Compose one-click start with no external dependencies.
    icon:
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
---

<!-- Terminal demo -->
<TerminalHero />

<!-- Flow diagram section -->
<div class="home-section">
  <h2>How it works</h2>
  <p class="subtitle">A transparent proxy between your application and LLM providers, with a plugin pipeline for observability and governance.</p>
  <FlowDiagram />
</div>
