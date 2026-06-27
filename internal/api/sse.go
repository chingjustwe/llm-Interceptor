// Package api implements the REST API and SSE broker for the LLM Interceptor
// web UI. It provides endpoints for querying stored requests, sessions, and
// statistics, as well as real-time event streaming.
package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

// SSEBroker manages Server-Sent Events subscriptions, allowing the server to
// push real-time events (such as new LLM requests) to connected web UI clients.
type SSEBroker struct {
	mu      sync.RWMutex
	clients map[chan []byte]struct{}
}

// NewSSEBroker creates a new SSE broker with an empty client set.
func NewSSEBroker() *SSEBroker {
	return &SSEBroker{clients: make(map[chan []byte]struct{})}
}

// Subscribe registers a new client channel for receiving SSE events. The caller
// must call Unsubscribe when done to avoid goroutine leaks.
func (b *SSEBroker) Subscribe() chan []byte {
	ch := make(chan []byte, 16)
	b.mu.Lock()
	b.clients[ch] = struct{}{}
	b.mu.Unlock()
	return ch
}

// Unsubscribe removes a client channel and closes it. This should be called
// when the client disconnects.
func (b *SSEBroker) Unsubscribe(ch chan []byte) {
	b.mu.Lock()
	delete(b.clients, ch)
	b.mu.Unlock()
	close(ch)
}

// Publish serializes data as JSON and sends it to all connected SSE clients.
// Clients with full buffers (slow consumers) are skipped to avoid blocking.
func (b *SSEBroker) Publish(data any) {
	msg, err := json.Marshal(data)
	if err != nil {
		return
	}
	b.mu.RLock()
	defer b.mu.RUnlock()
	for ch := range b.clients {
		select {
		case ch <- msg:
		default:
		}
	}
}

// ServeHTTP handles an SSE subscription request. It sets the appropriate headers
// for Server-Sent Events and streams events to the client until they disconnect.
func (b *SSEBroker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ch := b.Subscribe()
	defer b.Unsubscribe(ch)

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		}
	}
}
