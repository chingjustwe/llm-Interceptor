// Package proxy implements an HTTP passthrough proxy that forwards LLM API requests
// to upstream providers. It supports both synchronous and streaming (SSE) modes,
// and provides utilities for extracting usage data and tool calls from responses.
package proxy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// PluginResponse wraps the upstream provider's response, including status code,
// body, headers, measured duration, and parsed usage data.
type PluginResponse struct {
	StatusCode int
	Body       []byte
	Headers    map[string]string
	DurationMs int64
	Usage      UsageData
}

// ToolCall represents a tool invocation parsed from an LLM response.
type ToolCall struct {
	ID    string
	Name  string
	Input map[string]any
}

// ContentBlock represents a single item in the LLM response's content array.
// It is either a text block or a tool_use block.
type ContentBlock struct {
	Type      string         // "text" or "tool_use"
	Text      string         // for text blocks
	ToolUseID string         // for tool_use blocks
	Name      string         // for tool_use blocks
	Input     map[string]any // for tool_use blocks
}

// UsageData holds token usage counts parsed from an LLM response.
type UsageData struct {
	InputTokens         int
	OutputTokens        int
	CacheReadTokens     int
	CacheCreationTokens int
}

// Proxy is an HTTP client wrapper that forwards requests to a configured upstream LLM provider.
// It handles both synchronous and streaming request/response flows.
type Proxy struct {
	name     string
	upstream string
	client   *http.Client
}

// New creates a new Proxy targeting the given upstream URL. It validates the URL
// and sets a default 120-second timeout on the underlying HTTP client.
func New(name, upstreamURL string) (*Proxy, error) {
	if _, err := url.Parse(upstreamURL); err != nil {
		return nil, fmt.Errorf("invalid upstream URL: %w", err)
	}
	return &Proxy{
		name:     name,
		upstream: upstreamURL,
		client:   &http.Client{Timeout: 120 * time.Second},
	}, nil
}

// HandleRequest sends a synchronous request to the upstream provider and returns
// the full response body, status code, headers, and measured round-trip duration.
func (p *Proxy) HandleRequest(body []byte, headers map[string]string) (*PluginResponse, error) {
	start := time.Now()

	req, err := http.NewRequest("POST", p.upstream+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	if req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	pr := &PluginResponse{
		StatusCode: resp.StatusCode,
		Body:       respBody,
		Headers:    make(map[string]string, len(resp.Header)),
		DurationMs: time.Since(start).Milliseconds(),
	}
	for k, v := range resp.Header {
		pr.Headers[k] = v[0]
	}
	return pr, nil
}

// ExtractUsage parses an upstream JSON response body to extract token usage counts,
// tool calls, and the stop reason. Returns zero values if parsing fails.
func ExtractUsage(body []byte) (UsageData, []ToolCall, string) {
	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return UsageData{}, nil, ""
	}
	var usage UsageData
	if u, ok := raw["usage"].(map[string]any); ok {
		if v, ok := u["input_tokens"].(float64); ok {
			usage.InputTokens = int(v)
		}
		if v, ok := u["output_tokens"].(float64); ok {
			usage.OutputTokens = int(v)
		}
		if v, ok := u["cache_read_input_tokens"].(float64); ok {
			usage.CacheReadTokens = int(v)
		}
		if v, ok := u["cache_creation_input_tokens"].(float64); ok {
			usage.CacheCreationTokens = int(v)
		}
	}
	var stopReason string
	if sr, ok := raw["stop_reason"].(string); ok {
		stopReason = sr
	}
	var toolCalls []ToolCall
	if content, ok := raw["content"].([]any); ok {
		for _, c := range content {
			if block, ok := c.(map[string]any); ok && block["type"] == "tool_use" {
				var tc ToolCall
				if id, ok := block["id"].(string); ok {
					tc.ID = id
				}
				if name, ok := block["name"].(string); ok {
					tc.Name = name
				}
				if input, ok := block["input"].(map[string]any); ok {
					tc.Input = input
				}
				toolCalls = append(toolCalls, tc)
			}
		}
	}
	return usage, toolCalls, stopReason
}

// Forward is a generic passthrough handler that proxies any HTTP request to the
// upstream provider while preserving the original method, path, headers, and body.
func (p *Proxy) Forward(w http.ResponseWriter, r *http.Request) {
	target := p.upstream + r.URL.Path
	if r.URL.RawQuery != "" {
		target += "?" + r.URL.RawQuery
	}

	var body []byte
	if r.Body != nil {
		body, _ = io.ReadAll(r.Body)
		r.Body.Close()
	}

	req, err := http.NewRequest(r.Method, target, bytes.NewReader(body))
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	for k, v := range r.Header {
		req.Header[k] = v
	}

	resp, err := p.client.Do(req)
	if err != nil {
		http.Error(w, "upstream error", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	for k, v := range resp.Header {
		w.Header()[k] = v
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// HandleRequestStream sends a streaming (SSE) request to the upstream provider.
// It relays Server-Sent Events directly to the client, and collects aggregated
// usage data, tool calls, stop reason, and response body.
//
// If isToolBlocked is non-nil, the response is inspected for tool_use blocks
// whose name returns true. When a blocked tool is found, the method
// transparently synthesises a follow-up request: it sends a tool_result back
// to the LLM saying the tool was blocked, and forwards the LLM's subsequent
// response (after the LLM adapts) to the client instead of the original.
func (p *Proxy) HandleRequestStream(body []byte, headers map[string]string, w http.ResponseWriter, isToolBlocked func(name string) bool) ([]byte, *UsageData, []ToolCall, string, int64, error) {
	start := time.Now()

	req, err := http.NewRequest("POST", p.upstream+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, nil, nil, "", 0, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	if req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if req.Header.Get("Accept") == "" {
		req.Header.Set("Accept", "text/event-stream")
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, nil, nil, "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		for k, v := range resp.Header {
			w.Header()[k] = v
		}
		w.WriteHeader(resp.StatusCode)
		errBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, nil, nil, "", 0, fmt.Errorf("read error body: %w", err)
		}
		w.Write(errBody)
		return errBody, nil, nil, "", time.Since(start).Milliseconds(), nil
	}

	// Collect the SSE stream into a buffer (don't forward to client yet).
	sseText, contentBlocks, respBody, usage, tools, stopReason, duration, err := collectSSE(resp)
	_ = duration // total time for the upstream round-trip; follow-up resets it
	if err != nil {
		return nil, nil, nil, "", 0, err
	}

	// If any tool_use is blocked, synthesise a follow-up request.
	if isToolBlocked != nil {
		for _, tc := range tools {
			if isToolBlocked(tc.Name) {
				newBody := buildFollowUpRequest(body, contentBlocks, tools, isToolBlocked)
				if newBody != nil {
					return p.HandleRequestStream(newBody, headers, w, nil)
				}
				break
			}
		}
	}

	// No blocking needed — forward the buffered SSE to the client.
	for k, v := range resp.Header {
		w.Header()[k] = v
	}
	w.WriteHeader(resp.StatusCode)
	w.Write([]byte(sseText))

	return respBody, &usage, tools, stopReason, time.Since(start).Milliseconds(), nil
}

// buildFollowUpRequest builds a new LLM request body that appends the assistant's
// original response (text + tool_use) and a tool_result for each blocked tool
// to the message history. The LLM receives this as feedback that the tool was
// blocked and can adapt its strategy.
func buildFollowUpRequest(origBody []byte, contentBlocks []ContentBlock, tools []ToolCall, isToolBlocked func(name string) bool) []byte {
	var req map[string]any
	if err := json.Unmarshal(origBody, &req); err != nil {
		return nil
	}
	messages, ok := req["messages"].([]any)
	if !ok {
		return nil
	}

	// Build the assistant content array from SSE content blocks.
	var assistantContent []map[string]any
	for _, block := range contentBlocks {
		switch block.Type {
		case "text":
			assistantContent = append(assistantContent, map[string]any{
				"type": "text",
				"text": block.Text,
			})
		case "tool_use":
			assistantContent = append(assistantContent, map[string]any{
				"type":  "tool_use",
				"id":    block.ToolUseID,
				"name":  block.Name,
				"input": block.Input,
			})
		}
	}

	// Build tool_result blocks for blocked tools.
	var toolResultBlocks []map[string]any
	for _, tc := range tools {
		if isToolBlocked(tc.Name) {
			toolResultBlocks = append(toolResultBlocks, map[string]any{
				"type":        "tool_result",
				"tool_use_id": tc.ID,
				"content":     fmt.Sprintf("Tool '%s' is blocked by interceptor policy and cannot be used.", tc.Name),
			})
		}
	}

	// Append assistant message and tool_result user message.
	messages = append(messages, map[string]any{
		"role":    "assistant",
		"content": assistantContent,
	})
	messages = append(messages, map[string]any{
		"role":    "user",
		"content": toolResultBlocks,
	})

	req["messages"] = messages
	modified, err := json.Marshal(req)
	if err != nil {
		return nil
	}
	return modified
}
