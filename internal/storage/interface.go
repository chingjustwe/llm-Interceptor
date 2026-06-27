// Package storage defines the storage abstraction for persisting LLM request
// and response data. Implementations include SQLite (embedded, dev-friendly)
// and PostgreSQL (production).
package storage

import (
	"context"

	"github.com/chingjustwe/llm-interceptor/internal/types"
)

// Backend is the persistence interface for storing and querying LLM request
// records. Each request is stored with its metadata, usage data, and the
// original request/response bodies for audit and debugging.
type Backend interface {
	SaveRequest(ctx context.Context, req *types.StoredRequest) error
	GetSessionRequests(ctx context.Context, sessionID string, limit, offset int) ([]types.StoredRequest, error)
	QueryRequests(ctx context.Context, filter types.RequestFilter) ([]types.StoredRequest, error)
	Close() error
}
