// Package translate provides protocol translation between the Anthropic
// Messages API and the OpenAI Chat Completions API. This file handles
// converting OpenAI responses back to Anthropic format.
package translate

import "encoding/json"

// ToAnthropic converts an OpenAI Chat Completions API response body to
// Anthropic Messages API format. The response is reshaped into the Anthropic
// message structure with a content array and usage mapping. Only the first
// choice is used; multi-choice responses are not supported. Streaming SSE
// translation is not implemented.
func ToAnthropic(openAIBody []byte) ([]byte, error) {
	var resp struct {
		ID      string `json:"id"`
		Model   string `json:"model"`
		Choices []struct {
			Index   int `json:"index"`
			Message struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage *struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(openAIBody, &resp); err != nil {
		return nil, err
	}

	// Build Anthropic-style content array from the first choice.
	var content []json.RawMessage
	var stopReason string
	if len(resp.Choices) > 0 {
		textBlock, _ := json.Marshal(map[string]any{
			"type": "text",
			"text": resp.Choices[0].Message.Content,
		})
		content = append(content, textBlock)
		stopReason = resp.Choices[0].FinishReason
	}
	// Default to empty content array if no choices (degenerate response).
	if content == nil {
		content = make([]json.RawMessage, 0)
	}

	// Map usage tokens: OpenAI prompt_tokens → Anthropic input_tokens.
	usage := map[string]int{
		"input_tokens":  0,
		"output_tokens": 0,
	}
	if resp.Usage != nil {
		usage["input_tokens"] = resp.Usage.PromptTokens
		usage["output_tokens"] = resp.Usage.CompletionTokens
	}

	anthropicResp := map[string]any{
		"id":          resp.ID,
		"model":       resp.Model,
		"type":        "message",
		"role":        "assistant",
		"content":     content,
		"stop_reason": stopReason,
		"usage":       usage,
	}

	return json.Marshal(anthropicResp)
}
