// Package state defines the state store abstraction for rate-limiting counters
// and other ephemeral state. Implementations include in-memory (dev-friendly)
// and Redis (production).
package state

import "context"

// Backend is the state store interface for atomic counter operations used by
// rate-limiters, budget trackers, and other governance features. Implementations
// must be safe for concurrent use.
type Backend interface {
	Increment(ctx context.Context, key string, delta int64) (int64, error)
	Get(ctx context.Context, key string) (int64, error)
	Reset(ctx context.Context, key string) error
	IncrementWithTTL(ctx context.Context, key string, delta int64, ttlMs int64) (int64, error)
	GetMany(ctx context.Context, keys []string) (map[string]int64, error)
	Close() error
}
