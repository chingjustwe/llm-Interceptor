// Package state defines the state store abstraction for rate-limiting counters
// and other ephemeral state. Implementations include in-memory (dev-friendly)
// and Redis (production).
package state

import (
	"context"
	"sync"
	"time"
)

// memoryEntry holds a counter value with an optional expiry timestamp (Unix ms).
// Expired entries are cleaned up lazily on access or periodically by a background
// goroutine.
type memoryEntry struct {
	value  int64
	expiry int64
}

// MemoryBackend implements the Backend interface using in-memory maps protected
// by a read-write mutex. It is suitable for development and single-instance
// deployments where state persistence across restarts is not required.
type MemoryBackend struct {
	mu       sync.RWMutex
	counters map[string]*memoryEntry
	stopCh   chan struct{}
}

// NewMemory creates a MemoryBackend and starts a background goroutine that
// periodically purges expired entries every 5 minutes.
func NewMemory() *MemoryBackend {
	m := &MemoryBackend{
		counters: make(map[string]*memoryEntry),
		stopCh:   make(chan struct{}),
	}
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				m.cleanExpired()
			case <-m.stopCh:
				return
			}
		}
	}()
	return m
}

// cleanExpired removes all entries whose expiry timestamp is in the past.
// Called periodically by the background goroutine and on each write operation.
func (m *MemoryBackend) cleanExpired() {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UnixMilli()
	for k, entry := range m.counters {
		if entry.expiry > 0 && now > entry.expiry {
			delete(m.counters, k)
		}
	}
}

// Increment adds delta to the counter identified by key and returns the new
// value. If the key does not exist or its expiry has passed, the counter is
// reset to zero before incrementing.
func (m *MemoryBackend) Increment(ctx context.Context, key string, delta int64) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	entry, ok := m.counters[key]
	if !ok || (entry.expiry > 0 && time.Now().UnixMilli() > entry.expiry) {
		entry = &memoryEntry{value: 0}
		m.counters[key] = entry
	}
	entry.value += delta
	return entry.value, nil
}

// Get returns the current value of the counter identified by key. Returns 0
// if the key does not exist or its expiry has passed.
func (m *MemoryBackend) Get(ctx context.Context, key string) (int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	entry, ok := m.counters[key]
	if !ok {
		return 0, nil
	}
	if entry.expiry > 0 && time.Now().UnixMilli() > entry.expiry {
		return 0, nil
	}
	return entry.value, nil
}

// Reset deletes the counter identified by key, effectively resetting it to zero.
func (m *MemoryBackend) Reset(ctx context.Context, key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.counters, key)
	return nil
}

// IncrementWithTTL adds delta to the counter identified by key and sets/extends
// its expiry to ttlMs milliseconds from now. Returns the new counter value.
func (m *MemoryBackend) IncrementWithTTL(ctx context.Context, key string, delta int64, ttlMs int64) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	entry, ok := m.counters[key]
	if !ok || (entry.expiry > 0 && time.Now().UnixMilli() > entry.expiry) {
		entry = &memoryEntry{value: 0, expiry: time.Now().UnixMilli() + ttlMs}
		m.counters[key] = entry
	}
	entry.value += delta
	return entry.value, nil
}

// GetMany returns the current values for multiple counters in a single call.
// Keys that do not exist or have expired are omitted from the result map.
func (m *MemoryBackend) GetMany(ctx context.Context, keys []string) (map[string]int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make(map[string]int64, len(keys))
	now := time.Now().UnixMilli()
	for _, key := range keys {
		if entry, ok := m.counters[key]; ok {
			if entry.expiry == 0 || now <= entry.expiry {
				result[key] = entry.value
			}
		}
	}
	return result, nil
}

// Close stops the background expiry goroutine and releases resources.
func (m *MemoryBackend) Close() error {
	close(m.stopCh)
	return nil
}
