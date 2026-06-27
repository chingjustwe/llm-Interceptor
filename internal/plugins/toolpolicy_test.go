package plugins

import (
	"testing"

	"github.com/chingjustwe/llm-interceptor/internal/plugin"
)

func TestToolPolicyPlugin_IsBlocked_ExactMatch(t *testing.T) {
	p := NewToolPolicyPlugin([]string{"Bash"}, nil)
	if !p.IsBlocked("Bash") {
		t.Error("expected 'Bash' to be blocked")
	}
}

func TestToolPolicyPlugin_IsBlocked_CaseInsensitive(t *testing.T) {
	p := NewToolPolicyPlugin([]string{"Bash"}, nil)
	if !p.IsBlocked("bash") {
		t.Error("expected 'bash' (lowercase) to be blocked")
	}
	if !p.IsBlocked("BASH") {
		t.Error("expected 'BASH' (uppercase) to be blocked")
	}
}

func TestToolPolicyPlugin_IsBlocked_NonBlockedTool(t *testing.T) {
	p := NewToolPolicyPlugin([]string{"Bash"}, nil)
	if p.IsBlocked("Read") {
		t.Error("expected 'Read' not to be blocked")
	}
}

func TestToolPolicyPlugin_IsBlocked_EmptyBlockedList(t *testing.T) {
	p := NewToolPolicyPlugin(nil, nil)
	if p.IsBlocked("Bash") {
		t.Error("expected no tools blocked when list is empty")
	}
}

func TestToolPolicyPlugin_IsBlocked_AllowedOverridesBlocked(t *testing.T) {
	// When the same tool is in both lists, AllowedTools takes precedence.
	p := NewToolPolicyPlugin([]string{"Bash"}, []string{"Bash"})
	if p.IsBlocked("Bash") {
		t.Error("expected 'Bash' to be allowed when also in AllowedTools")
	}
}

func TestToolPolicyPlugin_IsBlocked_AllowedNotBlocked(t *testing.T) {
	p := NewToolPolicyPlugin([]string{"Bash"}, []string{"Read"})
	if p.IsBlocked("Read") {
		t.Error("expected 'Read' (in AllowedTools) not to be blocked")
	}
	if !p.IsBlocked("Bash") {
		t.Error("expected 'Bash' (not in AllowedTools) to be blocked")
	}
}

func TestToolPolicyPlugin_OnRequest_NoOp(t *testing.T) {
	// In the follow-up architecture, OnRequest is a no-op — tool blocking
	// logic lives in the proxy layer, not in the plugin hooks.
	p := NewToolPolicyPlugin([]string{"Bash"}, nil)

	body := []byte(`{"model":"claude-sonnet-4-6","messages":[{"role":"user","content":"list files"}]}`)
	ctx := &plugin.RequestContext{Body: body}
	result, err := p.OnRequest(ctx)
	if err != nil {
		t.Fatalf("OnRequest failed: %v", err)
	}
	if result != nil {
		t.Fatalf("expected nil HookResult, got %v", result)
	}
	if string(ctx.Body) != string(body) {
		t.Fatal("OnRequest should not modify the body")
	}
}

func TestToolPolicyPlugin_OnResponse_NoOp(t *testing.T) {
	p := NewToolPolicyPlugin([]string{"Bash"}, nil)

	body := []byte(`{"content":[{"type":"text","text":"hello"}]}`)
	ctx := &plugin.ResponseContext{Body: body}
	if err := p.OnResponse(ctx); err != nil {
		t.Fatalf("OnResponse failed: %v", err)
	}
	if string(ctx.Body) != string(body) {
		t.Fatal("OnResponse should not modify the body")
	}
}
