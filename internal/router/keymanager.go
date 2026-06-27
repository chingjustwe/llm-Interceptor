// Package router implements the LLM routing layer. This file contains the
// KeyManager, which handles generation, storage, and validation of managed
// API keys used in router mode.
package router

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/chingjustwe/llm-interceptor/internal/storage"
)

// keyByteLen is the number of random bytes used to generate an API key.
// The resulting hex-encoded key is twice this length (64 hex chars).
const keyByteLen = 32

// keyStorePrefixLen is the number of leading characters stored as the key
// prefix in the database. This allows fast lookup without exposing the full key.
// "sk-lli-" (7 chars) + first 5 hex chars = 12 characters total.
const keyStorePrefixLen = 12

// KeyManager manages the lifecycle of API keys: generation, hashing, storage,
// and validation. Keys are generated as random hex strings with a distinctive
// prefix, hashed with bcrypt before storage, and validated by prefix lookup
// followed by bcrypt comparison.
type KeyManager struct {
	store storage.Backend
}

// NewKeyManager creates a KeyManager backed by the given storage backend.
func NewKeyManager(store storage.Backend) *KeyManager {
	return &KeyManager{store: store}
}

// Generate creates a new API key with the given human-readable name, hashes
// it with bcrypt, persists it to storage, and returns the plaintext key.
// The plaintext key is only available at generation time; subsequent lookups
// can only verify a key via its prefix and bcrypt hash.
func (km *KeyManager) Generate(ctx context.Context, name string) (string, error) {
	raw := make([]byte, keyByteLen)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}
	apiKey := keyPrefix + hex.EncodeToString(raw)

	hash, err := bcrypt.GenerateFromPassword([]byte(apiKey), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("bcrypt hash: %w", err)
	}

	key := &storage.APIKey{
		KeyHash:   string(hash),
		KeyPrefix: apiKey[:keyStorePrefixLen],
		Name:      name,
		Enabled:   true,
		CreatedAt: time.Now().Unix(),
	}
	if err := km.store.SaveAPIKey(ctx, key); err != nil {
		return "", fmt.Errorf("save api key: %w", err)
	}
	return apiKey, nil
}

// Validate checks whether the given API key is valid: it looks up the stored
// record by prefix, verifies the key is enabled, and performs a bcrypt
// comparison. Returns true if the key is valid, false otherwise.
func (km *KeyManager) Validate(ctx context.Context, apiKey string) (bool, error) {
	if len(apiKey) < keyStorePrefixLen {
		return false, nil
	}
	prefix := apiKey[:keyStorePrefixLen]
	stored, err := km.store.GetAPIKeyByPrefix(ctx, prefix)
	if err != nil {
		return false, fmt.Errorf("lookup api key: %w", err)
	}
	if stored == nil {
		return false, nil
	}
	if !stored.Enabled {
		return false, nil
	}
	if err := bcrypt.CompareHashAndPassword([]byte(stored.KeyHash), []byte(apiKey)); err != nil {
		// Mismatch means wrong key, not an error.
		return false, nil
	}
	return true, nil
}
