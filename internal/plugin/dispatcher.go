package plugin

import (
	"context"
	"fmt"
)

type Dispatcher struct {
	plugins []Plugin
}

func NewDispatcher(plugins []Plugin) *Dispatcher {
	return &Dispatcher{plugins: plugins}
}

func (d *Dispatcher) ExecuteOnRequest(ctx *RequestContext) (*HookResult, error) {
	for _, p := range d.plugins {
		result, err := p.OnRequest(ctx)
		if err != nil {
			return nil, fmt.Errorf("plugin %s OnRequest: %w", p.Name(), err)
		}
		if result != nil && result.Block {
			return result, nil
		}
	}
	return nil, nil
}

func (d *Dispatcher) ExecuteOnResponse(ctx *ResponseContext) error {
	for i := len(d.plugins) - 1; i >= 0; i-- {
		if err := d.plugins[i].OnResponse(ctx); err != nil {
			return fmt.Errorf("plugin %s OnResponse: %w", d.plugins[i].Name(), err)
		}
	}
	return nil
}

func (d *Dispatcher) WrapContext(ctx context.Context) *RequestContext {
	return &RequestContext{
		Context:  ctx,
		Metadata: make(map[string]any),
	}
}
