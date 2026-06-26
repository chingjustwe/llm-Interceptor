// Package proxy implements an HTTP passthrough proxy that forwards LLM API requests
// to upstream providers. It supports both synchronous and streaming (SSE) modes,
// and provides utilities for extracting usage data and tool calls from responses.
package proxy

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// streamAndCollect reads Server-Sent Events from the upstream response, relays each
// event line to the caller via the ResponseWriter, and aggregates usage data, tool
// calls, stop reason, and response body from the event stream for post-processing
// by plugins.
func streamAndCollect(upstreamResp *http.Response, w http.ResponseWriter) ([]byte, UsageData, []ToolCall, string, int64, error) {
	start := time.Now()
	flusher, ok := w.(http.Flusher)
	if !ok {
		return nil, UsageData{}, nil, "", 0, fmt.Errorf("response writer does not support flushing")
	}

	var finalUsage UsageData
	var finalToolCalls []ToolCall
	var stopReason string
	var respBody strings.Builder

	scanner := bufio.NewScanner(upstreamResp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		_, _ = fmt.Fprintf(w, "%s\n", line)
		flusher.Flush()

		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")
			var raw map[string]any
			if err := json.Unmarshal([]byte(data), &raw); err != nil {
				continue
			}
			evtType, _ := raw["type"].(string)

			switch evtType {
			case "content_block_delta":
				if delta, ok := raw["delta"].(map[string]any); ok {
					if delta["type"] == "text_delta" {
						if text, ok := delta["text"].(string); ok {
							respBody.WriteString(text)
						}
					}
				}
			case "message_delta":
				if delta, ok := raw["delta"].(map[string]any); ok {
					if sr, ok := delta["stop_reason"].(string); ok {
						stopReason = sr
					}
				}
				if u, ok := raw["usage"].(map[string]any); ok {
					if v, ok := u["input_tokens"].(float64); ok {
						finalUsage.InputTokens = int(v)
					}
					if v, ok := u["output_tokens"].(float64); ok {
						finalUsage.OutputTokens = int(v)
					}
					if v, ok := u["cache_read_input_tokens"].(float64); ok {
						finalUsage.CacheReadTokens = int(v)
					}
					if v, ok := u["cache_creation_input_tokens"].(float64); ok {
						finalUsage.CacheCreationTokens = int(v)
					}
				}
			case "content_block_start":
				if block, ok := raw["content_block"].(map[string]any); ok {
					if block["type"] == "tool_use" {
						var tc ToolCall
						if name, ok := block["name"].(string); ok {
							tc.Name = name
						}
						if input, ok := block["input"].(map[string]any); ok {
							tc.Input = input
						}
						finalToolCalls = append(finalToolCalls, tc)
					}
				}
			}
		}
	}
	duration := time.Since(start).Milliseconds()
	return []byte(respBody.String()), finalUsage, finalToolCalls, stopReason, duration, scanner.Err()
}
