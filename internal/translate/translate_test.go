package translate

import (
	"encoding/json"
	"testing"
)

func TestToOpenAI_Basic(t *testing.T) {
	anthropicBody := []byte(`{
		"model": "claude-sonnet-4-6",
		"messages": [{"role":"user","content":"Hello"}],
		"max_tokens": 100
	}`)

	result, err := ToOpenAI(anthropicBody)
	if err != nil {
		t.Fatalf("ToOpenAI failed: %v", err)
	}

	var parsed openAIRequest
	if err := json.Unmarshal(result, &parsed); err != nil {
		t.Fatalf("unmarshal result: %v", err)
	}
	if parsed.Model != "claude-sonnet-4-6" {
		t.Fatalf("expected model claude-sonnet-4-6, got %s", parsed.Model)
	}
	if parsed.MaxTokens != 100 {
		t.Fatalf("expected max_tokens 100, got %d", parsed.MaxTokens)
	}
	if len(parsed.Messages) != 1 || parsed.Messages[0].Content != "Hello" {
		t.Fatalf("expected 1 user message 'Hello', got %+v", parsed.Messages)
	}
}

func TestToOpenAI_SystemField(t *testing.T) {
	anthropicBody := []byte(`{
		"model": "claude-sonnet-4-6",
		"system": "You are a helpful assistant.",
		"messages": [{"role":"user","content":"Hi"}],
		"max_tokens": 50
	}`)

	result, err := ToOpenAI(anthropicBody)
	if err != nil {
		t.Fatalf("ToOpenAI failed: %v", err)
	}

	var parsed openAIRequest
	if err := json.Unmarshal(result, &parsed); err != nil {
		t.Fatalf("unmarshal result: %v", err)
	}
	// System message should be prepended.
	if len(parsed.Messages) != 2 {
		t.Fatalf("expected 2 messages (system + user), got %d", len(parsed.Messages))
	}
	if parsed.Messages[0].Role != "system" {
		t.Fatalf("expected first message role=system, got %s", parsed.Messages[0].Role)
	}
	if parsed.Messages[0].Content != "You are a helpful assistant." {
		t.Fatalf("expected system content, got %s", parsed.Messages[0].Content)
	}
	if parsed.Messages[1].Role != "user" {
		t.Fatalf("expected second message role=user, got %s", parsed.Messages[1].Role)
	}
}

func TestToOpenAI_NoMaxTokens(t *testing.T) {
	anthropicBody := []byte(`{
		"model": "claude-sonnet-4-6",
		"messages": [{"role":"user","content":"Hello"}]
	}`)

	result, err := ToOpenAI(anthropicBody)
	if err != nil {
		t.Fatalf("ToOpenAI failed: %v", err)
	}

	var parsed openAIRequest
	if err := json.Unmarshal(result, &parsed); err != nil {
		t.Fatalf("unmarshal result: %v", err)
	}
	if parsed.MaxTokens != 0 {
		t.Fatalf("expected max_tokens 0 (omitted), got %d", parsed.MaxTokens)
	}
}

func TestToAnthropic_Basic(t *testing.T) {
	openAIBody := []byte(`{
		"id": "chatcmpl-abc",
		"model": "gpt-4",
		"choices": [{
			"index": 0,
			"message": {"role":"assistant","content":"Hi there"},
			"finish_reason": "stop"
		}],
		"usage": {"prompt_tokens": 10, "completion_tokens": 5}
	}`)

	result, err := ToAnthropic(openAIBody)
	if err != nil {
		t.Fatalf("ToAnthropic failed: %v", err)
	}

	var parsed map[string]any
	if err := json.Unmarshal(result, &parsed); err != nil {
		t.Fatalf("unmarshal result: %v", err)
	}
	if parsed["id"] != "chatcmpl-abc" {
		t.Fatalf("expected id chatcmpl-abc, got %v", parsed["id"])
	}
	if parsed["type"] != "message" {
		t.Fatalf("expected type message, got %v", parsed["type"])
	}
	if parsed["stop_reason"] != "stop" {
		t.Fatalf("expected stop_reason stop, got %v", parsed["stop_reason"])
	}

	// Check content array has one text block.
	contentArr, ok := parsed["content"].([]any)
	if !ok || len(contentArr) != 1 {
		t.Fatalf("expected 1 content block, got %v", parsed["content"])
	}
	block, ok := contentArr[0].(map[string]any)
	if !ok || block["type"] != "text" {
		t.Fatalf("expected text content block, got %v", contentArr[0])
	}
	if block["text"] != "Hi there" {
		t.Fatalf("expected text 'Hi there', got %v", block["text"])
	}

	// Check usage mapping.
	usage, ok := parsed["usage"].(map[string]any)
	if !ok {
		t.Fatalf("expected usage object, got %v", parsed["usage"])
	}
	if usage["input_tokens"] != float64(10) {
		t.Fatalf("expected input_tokens 10, got %v", usage["input_tokens"])
	}
	if usage["output_tokens"] != float64(5) {
		t.Fatalf("expected output_tokens 5, got %v", usage["output_tokens"])
	}
}

func TestToAnthropic_NoUsage(t *testing.T) {
	openAIBody := []byte(`{
		"id": "chatcmpl-xyz",
		"model": "gpt-4",
		"choices": [{
			"index": 0,
			"message": {"role":"assistant","content":"Hello"},
			"finish_reason": "stop"
		}]
	}`)

	result, err := ToAnthropic(openAIBody)
	if err != nil {
		t.Fatalf("ToAnthropic failed: %v", err)
	}

	var parsed map[string]any
	if err := json.Unmarshal(result, &parsed); err != nil {
		t.Fatalf("unmarshal result: %v", err)
	}
	usage, ok := parsed["usage"].(map[string]any)
	if !ok {
		t.Fatalf("expected usage object, got %v", parsed["usage"])
	}
	if usage["input_tokens"] != float64(0) {
		t.Fatalf("expected input_tokens 0, got %v", usage["input_tokens"])
	}
}

func TestToOpenAI_InvalidJSON(t *testing.T) {
	_, err := ToOpenAI([]byte(`not json`))
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestToAnthropic_InvalidJSON(t *testing.T) {
	_, err := ToAnthropic([]byte(`not json`))
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}
