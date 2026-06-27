// Package translate provides protocol translation between the Anthropic
// Messages API and the OpenAI Chat Completions API. Phase 4 supports
// text-only messages (user/assistant roles with system prompt translation).
// Tool calling, multimodal content, cache control, and streaming SSE
// translation are deferred to later phases.
package translate

import "encoding/json"

// openAIMessage is a single message in the OpenAI Chat Completions format.
type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// openAIRequest is the request body for the OpenAI Chat Completions API.
type openAIRequest struct {
	Model     string          `json:"model"`
	Messages  []openAIMessage `json:"messages"`
	MaxTokens int             `json:"max_tokens,omitempty"`
	Stream    bool            `json:"stream,omitempty"`
}

// ToOpenAI converts an Anthropic Messages API request body to OpenAI Chat
// Completions API format. The Anthropic "system" field (separate from
// messages) is prepended as a system-role message. Only text content is
// translated; tool use, images, and cache control are ignored.
func ToOpenAI(anthropicBody []byte) ([]byte, error) {
	var req struct {
		Model     string            `json:"model"`
		Messages  []json.RawMessage `json:"messages"`
		System    *string           `json:"system,omitempty"`
		MaxTokens *int              `json:"max_tokens,omitempty"`
		Stream    bool              `json:"stream,omitempty"`
	}
	if err := json.Unmarshal(anthropicBody, &req); err != nil {
		return nil, err
	}

	out := openAIRequest{
		Model:  req.Model,
		Stream: req.Stream,
	}

	// Convert messages: parse each as {role, content} text-only.
	for _, m := range req.Messages {
		var msg openAIMessage
		if err := json.Unmarshal(m, &msg); err != nil {
			continue // skip unparseable messages (e.g. tool_use blocks)
		}
		out.Messages = append(out.Messages, msg)
	}

	// Anthropic's separate system field becomes a system-role message.
	if req.System != nil {
		sysMsg := openAIMessage{Role: "system", Content: *req.System}
		out.Messages = append([]openAIMessage{sysMsg}, out.Messages...)
	}

	// Guard against nil pointer: only set MaxTokens if provided.
	if req.MaxTokens != nil {
		out.MaxTokens = *req.MaxTokens
	}

	return json.Marshal(out)
}
