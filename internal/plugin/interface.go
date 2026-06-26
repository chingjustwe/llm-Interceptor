package plugin

import "context"

type RequestContext struct {
	Context   context.Context
	ID        string
	Method    string
	Path      string
	Headers   map[string]string
	Body      []byte
	SessionID string
	AgentID   string
	Metadata  map[string]any
}

type HookResult struct {
	Block      bool
	Reason     string
	StatusCode int
}

type Usage struct {
	InputTokens         int
	OutputTokens        int
	CacheReadTokens     int
	CacheCreationTokens int
}

type ToolCall struct {
	Name  string
	Input map[string]any
}

type ResponseContext struct {
	RequestID  string
	SessionID  string
	Model      string
	Usage      Usage
	StopReason string
	ToolCalls  []ToolCall
	DurationMs int64
	StatusCode int
	Body       []byte
	Metadata   map[string]any
}

type Plugin interface {
	Name() string
	OnRequest(ctx *RequestContext) (*HookResult, error)
	OnResponse(ctx *ResponseContext) error
}
