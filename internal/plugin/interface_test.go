package plugin

import (
	"context"
	"fmt"
	"strings"
	"testing"
)

type mockPlugin struct {
	name      string
	block     bool
	blockErr  bool
	callOrder *[]string
}

func (m *mockPlugin) Name() string { return m.name }

func (m *mockPlugin) OnRequest(ctx *RequestContext) (*HookResult, error) {
	if m.callOrder != nil {
		*m.callOrder = append(*m.callOrder, "request:"+m.name)
	}
	if m.blockErr {
		return nil, fmt.Errorf("error from %s", m.name)
	}
	if m.block {
		return &HookResult{Block: true, Reason: "blocked by " + m.name, StatusCode: 403}, nil
	}
	return nil, nil
}

func (m *mockPlugin) OnResponse(ctx *ResponseContext) error {
	if m.callOrder != nil {
		*m.callOrder = append(*m.callOrder, "response:"+m.name)
	}
	return nil
}

func TestDispatcher_ExecuteOnRequest_NoBlock(t *testing.T) {
	a := &mockPlugin{name: "A"}
	b := &mockPlugin{name: "B"}
	d := NewDispatcher([]Plugin{a, b})

	ctx := &RequestContext{Metadata: make(map[string]any)}
	result, err := d.ExecuteOnRequest(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Fatalf("expected nil result, got %+v", result)
	}
}

func TestDispatcher_ExecuteOnRequest_Block(t *testing.T) {
	a := &mockPlugin{name: "A", callOrder: &[]string{}}
	b := &mockPlugin{name: "B", callOrder: &[]string{}, block: true}
	c := &mockPlugin{name: "C", callOrder: &[]string{}}
	d := NewDispatcher([]Plugin{a, b, c})

	ctx := &RequestContext{Metadata: make(map[string]any)}
	result, err := d.ExecuteOnRequest(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil || !result.Block {
		t.Fatalf("expected blocked result, got %+v", result)
	}
	if len(*c.callOrder) != 0 {
		t.Fatalf("expected C to not be called, got %v", *c.callOrder)
	}
}

func TestDispatcher_ExecuteOnResponse_ReverseOrder(t *testing.T) {
	var callOrder []string
	a := &mockPlugin{name: "A", callOrder: &callOrder}
	b := &mockPlugin{name: "B", callOrder: &callOrder}
	d := NewDispatcher([]Plugin{a, b})

	_ = d.ExecuteOnResponse(&ResponseContext{})

	if len(callOrder) != 2 {
		t.Fatalf("expected 2 calls, got %d", len(callOrder))
	}
	if callOrder[0] != "response:B" || callOrder[1] != "response:A" {
		t.Fatalf("expected reverse order [B, A], got %v", callOrder)
	}
}

func TestDispatcher_OnRequest_Error(t *testing.T) {
	co := &[]string{}
	a := &mockPlugin{name: "A", callOrder: co}
	b := &mockPlugin{name: "B", callOrder: co, blockErr: true}
	c := &mockPlugin{name: "C", callOrder: co}
	d := NewDispatcher([]Plugin{a, b, c})

	ctx := &RequestContext{Metadata: make(map[string]any)}
	result, err := d.ExecuteOnRequest(ctx)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if result != nil {
		t.Fatalf("expected nil result on error, got %+v", result)
	}
	if !strings.Contains(err.Error(), "error from B") {
		t.Fatalf("expected error from B, got %v", err)
	}
	if len(*co) != 2 {
		t.Fatalf("expected only A and B to be called, got %v", *co)
	}
}

func TestDispatcher_Empty(t *testing.T) {
	d := NewDispatcher([]Plugin{})

	ctx := &RequestContext{Metadata: make(map[string]any)}
	result, err := d.ExecuteOnRequest(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Fatalf("expected nil result, got %+v", result)
	}

	err = d.ExecuteOnResponse(&ResponseContext{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDispatcher_WrapContext(t *testing.T) {
	d := NewDispatcher(nil)

	ctx := context.Background()
	rc := d.WrapContext(ctx)

	if rc == nil {
		t.Fatal("expected non-nil RequestContext")
	}
	if rc.Context != ctx {
		t.Fatal("expected context to match")
	}
	if rc.Metadata == nil {
		t.Fatal("expected non-nil Metadata map")
	}
}
