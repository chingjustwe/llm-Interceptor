// Package api tests the REST handler with a mock storage backend.
package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/chingjustwe/llm-interceptor/internal/state"
	"github.com/chingjustwe/llm-interceptor/internal/storage"
	"github.com/chingjustwe/llm-interceptor/internal/types"
	"github.com/go-chi/chi/v5"
)

// mockStore is an in-memory storage backend for handler tests.
type mockStore struct {
	requests []types.StoredRequest
}

func newMockStore(reqs []types.StoredRequest) *mockStore {
	return &mockStore{requests: reqs}
}

func (m *mockStore) SaveRequest(_ context.Context, _ *types.StoredRequest) error { return nil }

func (m *mockStore) GetSessionRequests(_ context.Context, sessionID string, limit, offset int) ([]types.StoredRequest, error) {
	var result []types.StoredRequest
	for _, r := range m.requests {
		if r.SessionID == sessionID {
			result = append(result, r)
		}
	}
	// Apply pagination
	if offset > len(result) {
		return nil, nil
	}
	result = result[offset:]
	if limit > 0 && limit < len(result) {
		result = result[:limit]
	}
	return result, nil
}

// QueryRequests simulates the LIKE filtering now done at the storage layer.
func (m *mockStore) QueryRequests(_ context.Context, filter types.RequestFilter) ([]types.StoredRequest, error) {
	var result []types.StoredRequest
	for _, r := range m.requests {
		if filter.SessionID != nil {
			if !strings.Contains(r.SessionID, *filter.SessionID) {
				continue
			}
		}
		if filter.Model != nil {
			if !strings.Contains(r.Model, *filter.Model) {
				continue
			}
		}
		if filter.From != nil && r.CreatedAt < *filter.From {
			continue
		}
		if filter.To != nil && r.CreatedAt > *filter.To {
			continue
		}
		result = append(result, r)
	}
	// Apply offset & limit
	if filter.Offset > len(result) {
		return nil, nil
	}
	result = result[filter.Offset:]
	if filter.Limit > 0 && filter.Limit < len(result) {
		result = result[:filter.Limit]
	}
	return result, nil
}

func (m *mockStore) SaveAPIKey(_ context.Context, _ *storage.APIKey) error { return nil }
func (m *mockStore) GetAPIKeyByPrefix(_ context.Context, _ string) (*storage.APIKey, error) {
	return nil, nil
}
func (m *mockStore) ListAPIKeys(_ context.Context) ([]storage.APIKey, error) { return nil, nil }
func (m *mockStore) DisableAPIKey(_ context.Context, _ string) error        { return nil }
func (m *mockStore) Close() error                                           { return nil }

// mockState is a no-op state backend for handler tests.
type mockState struct{}

func (m *mockState) Increment(_ context.Context, _ string, _ int64) (int64, error) { return 0, nil }
func (m *mockState) Get(_ context.Context, _ string) (int64, error)                { return 0, nil }
func (m *mockState) Reset(_ context.Context, _ string) error                       { return nil }
func (m *mockState) IncrementWithTTL(_ context.Context, _ string, _ int64, _ int64) (int64, error) {
	return 0, nil
}
func (m *mockState) GetMany(_ context.Context, _ []string) (map[string]int64, error) {
	return nil, nil
}
func (m *mockState) Close() error { return nil }

var _ state.Backend = (*mockState)(nil)

func setupTestHandler(reqs []types.StoredRequest) *Handler {
	return NewHandler(newMockStore(reqs), &mockState{})
}

func TestListRequests_NoFilter(t *testing.T) {
	reqs := []types.StoredRequest{
		{ID: "r1", Model: "claude-sonnet-4", SessionID: "sess_a", DurationMs: 100, StatusCode: 200, CreatedAt: 1000},
		{ID: "r2", Model: "gpt-4o", SessionID: "sess_b", DurationMs: 200, StatusCode: 200, CreatedAt: 2000},
		{ID: "r3", Model: "claude-haiku", SessionID: "sess_a", DurationMs: 50, StatusCode: 429, CreatedAt: 3000},
	}
	h := setupTestHandler(reqs)

	r := httptest.NewRequest("GET", "/api/requests", nil)
	w := httptest.NewRecorder()
	h.listRequests(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var got []types.StoredRequest
	if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected 3 requests, got %d", len(got))
	}
}

func TestListRequests_FilterByModel(t *testing.T) {
	reqs := []types.StoredRequest{
		{ID: "r1", Model: "claude-sonnet-4", SessionID: "sess_a"},
		{ID: "r2", Model: "gpt-4o", SessionID: "sess_b"},
		{ID: "r3", Model: "claude-haiku", SessionID: "sess_a"},
	}
	h := setupTestHandler(reqs)

	r := httptest.NewRequest("GET", "/api/requests?model=claude", nil)
	w := httptest.NewRecorder()
	h.listRequests(w, r)

	var got []types.StoredRequest
	json.NewDecoder(w.Body).Decode(&got)
	if len(got) != 2 {
		t.Fatalf("expected 2 claude requests, got %d", len(got))
	}
	for _, req := range got {
		if !strings.Contains(req.Model, "claude") {
			t.Errorf("unexpected model %q in filtered results", req.Model)
		}
	}
}

func TestListRequests_FilterBySessionID(t *testing.T) {
	reqs := []types.StoredRequest{
		{ID: "r1", Model: "claude-sonnet-4", SessionID: "session_alpha"},
		{ID: "r2", Model: "gpt-4o", SessionID: "session_beta"},
		{ID: "r3", Model: "claude-haiku", SessionID: "session_alpha"},
	}
	h := setupTestHandler(reqs)

	r := httptest.NewRequest("GET", "/api/requests?session_id=alpha", nil)
	w := httptest.NewRecorder()
	h.listRequests(w, r)

	var got []types.StoredRequest
	json.NewDecoder(w.Body).Decode(&got)
	if len(got) != 2 {
		t.Fatalf("expected 2 requests for alpha session, got %d", len(got))
	}
	for _, req := range got {
		if req.SessionID != "session_alpha" {
			t.Errorf("unexpected session %q in filtered results", req.SessionID)
		}
	}
}

func TestListRequests_FilterByModelAndSession(t *testing.T) {
	reqs := []types.StoredRequest{
		{ID: "r1", Model: "claude-sonnet-4", SessionID: "session_alpha"},
		{ID: "r2", Model: "gpt-4o", SessionID: "session_alpha"},
		{ID: "r3", Model: "claude-haiku", SessionID: "session_beta"},
		{ID: "r4", Model: "claude-opus", SessionID: "session_beta"},
	}
	h := setupTestHandler(reqs)

	r := httptest.NewRequest("GET", "/api/requests?model=claude&session_id=beta", nil)
	w := httptest.NewRecorder()
	h.listRequests(w, r)

	var got []types.StoredRequest
	json.NewDecoder(w.Body).Decode(&got)
	if len(got) != 2 {
		t.Fatalf("expected 2 requests (r3 claude-haiku, r4 claude-opus both in beta), got %d", len(got))
	}
}

func TestListRequests_NoMatch(t *testing.T) {
	reqs := []types.StoredRequest{
		{ID: "r1", Model: "claude-sonnet-4", SessionID: "sess_a"},
	}
	h := setupTestHandler(reqs)

	r := httptest.NewRequest("GET", "/api/requests?model=nonexistent", nil)
	w := httptest.NewRecorder()
	h.listRequests(w, r)

	var got []types.StoredRequest
	json.NewDecoder(w.Body).Decode(&got)
	if len(got) != 0 {
		t.Fatalf("expected 0 results, got %d", len(got))
	}
}

func TestListSessions_FilterByModel(t *testing.T) {
	reqs := []types.StoredRequest{
		{ID: "r1", Model: "claude-sonnet-4", SessionID: "sess_a"},
		{ID: "r2", Model: "gpt-4o", SessionID: "sess_b"},
		{ID: "r3", Model: "claude-haiku", SessionID: "sess_a"},
		{ID: "r4", Model: "gpt-4o-mini", SessionID: "sess_c"},
	}
	h := setupTestHandler(reqs)

	r := httptest.NewRequest("GET", "/api/sessions?model=gpt", nil)
	w := httptest.NewRecorder()
	h.listSessions(w, r)

	var got []struct {
		ID    string `json:"id"`
		Count int    `json:"count"`
	}
	json.NewDecoder(w.Body).Decode(&got)

	// Only sess_b (gpt-4o) and sess_c (gpt-4o-mini) should match.
	if len(got) != 2 {
		t.Fatalf("expected 2 sessions, got %d: %+v", len(got), got)
	}
	// sess_a should not appear (its models don't contain "gpt")
	for _, s := range got {
		if s.ID == "sess_a" {
			t.Errorf("sess_a should not appear in gpt-filtered sessions")
		}
	}
}

// Test with chi router to ensure routes are wired correctly.
func TestHandlerRegister_RoutesExist(t *testing.T) {
	h := setupTestHandler(nil)
	r := chi.NewRouter()
	h.Register(r)

	paths := []string{
		"/api/requests",
		"/api/sessions",
		"/api/stats",
		"/api/keys",
	}
	for _, p := range paths {
		req := httptest.NewRequest("GET", p, nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		// The handler returns 200 even with empty data; we just check the route exists.
		if w.Code == http.StatusNotFound {
			t.Errorf("route %s returned 404", p)
		}
	}
}

func TestListRequests_Pagination(t *testing.T) {
	reqs := make([]types.StoredRequest, 10)
	for i := 0; i < 10; i++ {
		reqs[i] = types.StoredRequest{
			ID:    fmt.Sprintf("r%d", i+1),
			Model: fmt.Sprintf("model-%d", i+1),
		}
	}
	h := setupTestHandler(reqs)

	r := httptest.NewRequest("GET", "/api/requests?limit=3&offset=5", nil)
	w := httptest.NewRecorder()
	h.listRequests(w, r)

	var got []types.StoredRequest
	json.NewDecoder(w.Body).Decode(&got)
	if len(got) != 3 {
		t.Fatalf("expected 3 requests (limit=3 offset=5), got %d", len(got))
	}
}
