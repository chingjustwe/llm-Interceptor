<template>
  <div class="terminal">
    <div class="terminal-header">
      <span class="terminal-dot" />
      <span class="terminal-dot" />
      <span class="terminal-dot" />
      <span class="terminal-title">bash — llm-interceptor</span>
    </div>
    <div class="terminal-body">
      <div class="line">
        <span class="prompt">$</span>
        <span class="cmd">git clone https://github.com/chingjustwe/llm-interceptor.git</span>
      </div>
      <div class="line output">Cloning into 'llm-interceptor'... ✓</div>
      <div class="line">
        <span class="prompt">$</span>
        <span class="cmd">cd llm-interceptor && go build -o llm-interceptor ./cmd/llm-interceptor/</span>
      </div>
      <div class="line output">✓ Binary built (13 MB)</div>
      <div class="line">
        <span class="prompt">$</span>
        <span class="cmd">./llm-interceptor config.example.yaml</span>
      </div>
      <div class="line output highlight">[server] Listening on <span class="accent">127.0.0.1:8080</span></div>
      <div class="line output">[plugins] Loaded: otel, cost-tracker, budget, rate-limit, tool-policy</div>
      <div class="line output">[router] Mode: <span class="accent">passthrough</span> (upstream: api.anthropic.com)</div>
      <div class="line">
        <span class="prompt">$</span>
        <span class="cmd blink-cursor" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal {
  max-width: 680px;
  margin: 48px auto;
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  text-align: left;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
}

.dark .terminal {
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.terminal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.terminal-dot:nth-child(1) { background: #ef4444; }
.terminal-dot:nth-child(2) { background: #f59e0b; }
.terminal-dot:nth-child(3) { background: #22c55e; }

.terminal-title {
  margin-left: 8px;
  font-size: 11px;
  color: #475569;
  font-family: 'JetBrains Mono', monospace;
}

.terminal-body {
  padding: 20px 24px;
  font-size: 13px;
  line-height: 2;
  font-family: 'JetBrains Mono', monospace;
}

.line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prompt {
  color: #22c55e;
  margin-right: 8px;
}

.cmd {
  color: #e2e8f0;
}

.output {
  color: #64748b;
  padding-left: 20px;
}

.output.highlight {
  color: #94a3b8;
}

.accent {
  color: #fbbf24;
  font-weight: 500;
}

.blink-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: #22c55e;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 2px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .blink-cursor {
    animation: none;
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .terminal-body {
    padding: 14px 16px;
    font-size: 11px;
  }
  .terminal-body .line {
    white-space: normal;
    word-break: break-all;
  }
}
</style>
