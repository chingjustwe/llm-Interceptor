// Package plugins provides built-in plugin implementations for the
// LLM Interceptor.

package plugins

import (
	"strings"

	"github.com/chingjustwe/llm-interceptor/internal/plugin"
)

// ToolPolicyPlugin checks tool_use blocks in LLM responses against a blocklist
// or allowlist. Blocked tools are intercepted at the proxy layer: the SSE
// stream is buffered, and when a blocked tool_use is detected, a follow-up
// request is sent to the LLM with tool_result="blocked", allowing the LLM to
// adapt. The client never sees the blocked tool_use. It operates in one of
// two mutually exclusive modes:
//   - blocklist: blocks only the explicitly listed tools (all others pass)
//   - allowlist: blocks any tool not in the allowed set
type ToolPolicyPlugin struct {
	blockedTools map[string]bool
	allowedTools map[string]bool
	mode         string // "blocklist" or "allowlist"
}

// NewToolPolicyPlugin creates a ToolPolicyPlugin with the given blocked and
// allowed tool name lists. If allowed is non-empty, the plugin operates in
// allowlist mode; otherwise it operates in blocklist mode.
func NewToolPolicyPlugin(blocked, allowed []string) *ToolPolicyPlugin {
	p := &ToolPolicyPlugin{
		blockedTools: make(map[string]bool, len(blocked)),
		allowedTools: make(map[string]bool, len(allowed)),
		mode:         "blocklist",
	}
	for _, t := range blocked {
		p.blockedTools[strings.ToLower(t)] = true
	}
	if len(allowed) > 0 {
		p.mode = "allowlist"
		for _, t := range allowed {
			p.allowedTools[strings.ToLower(t)] = true
		}
	}
	return p
}

// Name returns "tool-policy" as the plugin identifier.
func (t *ToolPolicyPlugin) Name() string { return "tool-policy" }

// OnRequest is a no-op — tool blocking happens at the proxy layer, which
// intercepts the SSE stream before it reaches the client. Blocked tool_use
// blocks never reach the client, so no blocked tool_result can arrive in a
// subsequent request.
func (t *ToolPolicyPlugin) OnRequest(ctx *plugin.RequestContext) (*plugin.HookResult, error) {
	return nil, nil
}

// OnResponse is a no-op — tool blocking happens at the proxy layer during
// the SSE streaming response, not in the response hook.
func (t *ToolPolicyPlugin) OnResponse(ctx *plugin.ResponseContext) error {
	return nil
}

// IsBlocked returns true if the given tool name (case-insensitive) is blocked
// by policy. Used by the proxy to intercept tool_use content blocks in SSE
// streams and non-streaming responses.
//
// The resolution order is: allowlist overrides blocklist. A tool is allowed if:
//   - it appears in AllowedTools (regardless of BlockedTools), or
//   - no BlockedTools are configured (blocklist mode with non-blocked tools)
//
// A tool is blocked if:
//   - it appears in BlockedTools and not in AllowedTools, or
//   - AllowedTools are configured and the tool is not in that list (allowlist mode).
func (t *ToolPolicyPlugin) IsBlocked(name string) bool {
	lower := strings.ToLower(name)
	if t.allowedTools[lower] {
		return false
	}
	if t.blockedTools[lower] {
		return true
	}
	if t.mode == "allowlist" {
		return true
	}
	return false
}
