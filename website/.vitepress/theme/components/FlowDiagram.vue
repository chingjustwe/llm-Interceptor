<template>
  <div class="flow-diagram" :class="{ 'reduced-motion': prefersReducedMotion }">
    <!-- App node -->
    <div class="node app-node">
      <div class="node-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
      </div>
      <span class="node-label">App</span>
      <span class="node-sub">SDK / HTTP</span>
    </div>

    <!-- Arrow -->
    <div class="connector">
      <div class="arrow-line" />
      <div class="arrow-head" />
      <div class="flow-dot" />
    </div>

    <!-- Gateway node -->
    <div class="node gateway-node">
      <div class="node-badge">LLM Interceptor</div>
      <div class="node-plugins">
        <span class="plugin-tag">OTel</span>
        <span class="plugin-tag">Cost</span>
        <span class="plugin-tag">Budget</span>
        <span class="plugin-tag">Rate&nbsp;Limit</span>
        <span class="plugin-tag">Tool&nbsp;Policy</span>
      </div>
      <div class="node-branches">
        <div class="branch">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="branch-icon"><path d="M3 10h6m0 0 3-3m-3 3 3 3"/></svg>
          <span>Storage</span>
          <span class="branch-sub">SQLite / PG</span>
        </div>
        <div class="branch">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="branch-icon"><path d="M3 10h6m0 0 3-3m-3 3 3 3"/></svg>
          <span>State</span>
          <span class="branch-sub">Memory / Redis</span>
        </div>
      </div>
    </div>

    <!-- Arrow -->
    <div class="connector">
      <div class="arrow-line" />
      <div class="arrow-head" />
      <div class="flow-dot" style="animation-delay: 1.5s" />
    </div>

    <!-- Provider node -->
    <div class="node provider-node">
      <div class="node-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="12" rx="8" ry="10" transform="rotate(0 12 12)"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      </div>
      <span class="node-label">Provider</span>
      <span class="node-sub">Anthropic / OpenAI</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const prefersReducedMotion = ref(false)

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
</script>

<style scoped>
.flow-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 16px;
  flex-wrap: nowrap;
}

.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 24px;
  border-radius: 14px;
  border: 2px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  min-width: 140px;
  transition: border-color 0.2s;
}

.app-node { border-color: var(--vp-c-indigo); }
.gateway-node {
  border-color: var(--vp-c-brand-1);
  min-width: 200px;
  padding: 16px 20px;
  position: relative;
  box-shadow: 0 0 20px color-mix(in srgb, var(--vp-c-brand-1) 15%, transparent);
}
.provider-node { border-color: var(--vp-c-text-3); }

.node-icon {
  width: 32px;
  height: 32px;
  color: var(--vp-c-text-2);
}
.app-node .node-icon { color: var(--vp-c-indigo); }
.gateway-node .node-icon { color: var(--vp-c-brand-1); }
.provider-node .node-icon { color: var(--vp-c-text-3); }

.node-label {
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.node-sub {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.node-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.node-plugins {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  margin: 4px 0;
}

.plugin-tag {
  font-size: 10px;
  font-family: var(--vp-font-family-mono);
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
  color: var(--vp-c-brand-1);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 20%, transparent);
}

.node-branches {
  display: flex;
  gap: 16px;
  margin-top: 4px;
}

.branch {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

.branch-icon {
  width: 14px;
  height: 14px;
  color: var(--vp-c-text-3);
}

.branch-sub {
  display: none;
  font-size: 10px;
  color: var(--vp-c-text-3);
}

/* ---- Connector ---- */
.connector {
  position: relative;
  width: 48px;
  height: 4px;
  flex-shrink: 0;
}

.arrow-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--vp-c-border);
  top: 50%;
  transform: translateY(-50%);
}

.arrow-head {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid var(--vp-c-text-3);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

.flow-dot {
  position: absolute;
  left: 0;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  transform: translateY(-50%);
  animation: flow-pulse 2s ease-in-out infinite;
  box-shadow: 0 0 6px var(--vp-c-brand-1);
}

/* ---- Animation ---- */
@keyframes flow-pulse {
  0% { left: 0; opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { left: calc(100% - 8px); opacity: 0; }
}

.reduced-motion .flow-dot {
  animation: none;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.6;
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .flow-diagram {
    flex-direction: column;
    gap: 8px;
    padding: 32px 16px;
  }

  .connector {
    width: 4px;
    height: 32px;
  }

  .arrow-line {
    width: 2px;
    height: 100%;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
  }

  .arrow-head {
    right: auto;
    top: auto;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 8px solid var(--vp-c-text-3);
    border-bottom: none;
  }

  .flow-dot {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    animation: flow-pulse-vertical 2s ease-in-out infinite;
  }

  @keyframes flow-pulse-vertical {
    0% { top: 0; opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { top: calc(100% - 8px); opacity: 0; }
  }

  .reduced-motion .flow-dot {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .gateway-node { min-width: 160px; padding: 12px 16px; }
  .node { min-width: 100px; padding: 14px 16px; }
  .node-plugins .plugin-tag { font-size: 9px; padding: 1px 6px; }
}
</style>
