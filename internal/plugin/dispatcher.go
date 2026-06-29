// Package plugin defines the plugin interface for intercepting and extending
// LLM request/response lifecycle. Plugins implement OnRequest for pre-processing
// (e.g., auth, rate-limiting) and OnResponse for post-processing (e.g., logging,
// cost tracking, metrics export).
package plugin

import (
	"context"
	"fmt"
	"log"
)

// Dispatcher manages a list of plugins and executes them in order for each
// request/response lifecycle phase. OnRequest runs plugins in registration
// order (first wins on Block); OnResponse runs in reverse order (LIFO).
type Dispatcher struct {
	plugins []Plugin
}

// NewDispatcher creates a Dispatcher with the given plugin list.
func NewDispatcher(plugins []Plugin) *Dispatcher {
	return &Dispatcher{plugins: plugins}
}

// ExecuteOnRequest runs each plugin's OnRequest hook in registration order.
// If any plugin returns Block=true, subsequent plugins are skipped and the
// blocking result is returned immediately. Returns nil if all plugins pass.
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

// ExecuteOnResponse runs each plugin's OnResponse hook in reverse registration
// order (LIFO), matching the typical middleware pattern where the outermost
// plugin's response hook runs last.
func (d *Dispatcher) ExecuteOnResponse(ctx *ResponseContext) error {
	for i := len(d.plugins) - 1; i >= 0; i-- {
		if err := d.plugins[i].OnResponse(ctx); err != nil {
			return fmt.Errorf("plugin %s OnResponse: %w", d.plugins[i].Name(), err)
		}
	}
	return nil
}

// ReloadConfig broadcasts a configuration change to all plugins that implement
// the ConfigReloader interface. Unknown keys and plugins that don't support
// reload are silently skipped. Errors are logged but not returned so one
// plugin's failure doesn't block others.
func (d *Dispatcher) ReloadConfig(key string, value []byte) {
	for _, p := range d.plugins {
		cr, ok := p.(ConfigReloader)
		if !ok {
			continue
		}
		if err := cr.ReloadConfig(key, value); err != nil {
			log.Printf("plugin %s: ReloadConfig(%q) error: %v", p.Name(), key, err)
		}
	}
}

// WrapContext creates a new RequestContext from a standard context, initializing
// the Metadata map for cross-plugin communication.
func (d *Dispatcher) WrapContext(ctx context.Context) *RequestContext {
	return &RequestContext{
		Context:  ctx,
		Metadata: make(map[string]any),
	}
}
