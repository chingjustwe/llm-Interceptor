// Package storage defines the storage abstraction for persisting LLM request
// and response data. Implementations include SQLite (embedded, dev-friendly)
// and PostgreSQL (production).
package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/chingjustwe/llm-interceptor/internal/types"
)

// PostgresBackend implements the Backend interface using a PostgreSQL database.
// It uses a connection pool via pgxpool for concurrent access and production
// deployments.
type PostgresBackend struct {
	pool *pgxpool.Pool
}

// compile-time check that PostgresBackend satisfies Backend.
var _ Backend = (*PostgresBackend)(nil)

// NewPostgres opens a PostgreSQL connection pool using the given connection
// string, verifies connectivity with a ping, and initializes the requests table
// and indexes if they do not exist.
func NewPostgres(connString string) (*PostgresBackend, error) {
	pool, err := pgxpool.New(context.Background(), connString)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	if _, err := pool.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS requests (
			id TEXT PRIMARY KEY,
			session_id TEXT,
			model TEXT,
			method TEXT,
			path TEXT,
			request_body TEXT,
			response_body TEXT,
			input_tokens INTEGER DEFAULT 0,
			output_tokens INTEGER DEFAULT 0,
			cache_read_tokens INTEGER DEFAULT 0,
			cache_creation_tokens INTEGER DEFAULT 0,
			duration_ms INTEGER,
			status_code INTEGER,
			created_at TIMESTAMP DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_requests_session ON requests(session_id);
		CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at);
	`); err != nil {
		pool.Close()
		return nil, fmt.Errorf("create table: %w", err)
	}
	return &PostgresBackend{pool: pool}, nil
}

// SaveRequest inserts a new LLM request record into the database, including
// metadata, token usage, and the original request/response bodies.
func (p *PostgresBackend) SaveRequest(ctx context.Context, req *types.StoredRequest) error {
	_, err := p.pool.Exec(ctx,
		`INSERT INTO requests (id, session_id, model, method, path, request_body, response_body,
		 input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
		 duration_ms, status_code, created_at) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		req.ID, req.SessionID, req.Model, req.Method, req.Path,
		req.Request, req.Response,
		req.Usage.InputTokens, req.Usage.OutputTokens,
		req.Usage.CacheReadTokens, req.Usage.CacheCreationTokens,
		req.DurationMs, req.StatusCode,
		// CreatedAt is Unix milliseconds; convert to time.Time for the TIMESTAMP column.
		time.UnixMilli(req.CreatedAt),
	)
	if err != nil {
		return fmt.Errorf("save request: %w", err)
	}
	return nil
}

// GetSessionRequests retrieves all requests belonging to a specific session,
// ordered by creation time descending, with pagination via limit and offset.
func (p *PostgresBackend) GetSessionRequests(ctx context.Context, sessionID string, limit, offset int) ([]types.StoredRequest, error) {
	rows, err := p.pool.Query(ctx,
		`SELECT id, session_id, model, method, path, request_body, response_body,
		 input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
		 duration_ms, status_code, (EXTRACT(EPOCH FROM created_at) * 1000)::bigint
		 FROM requests WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		sessionID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("get session requests: %w", err)
	}
	defer rows.Close()
	results := make([]types.StoredRequest, 0)
	for rows.Next() {
		var r types.StoredRequest
		if err := rows.Scan(&r.ID, &r.SessionID, &r.Model, &r.Method, &r.Path,
			&r.Request, &r.Response,
			&r.Usage.InputTokens, &r.Usage.OutputTokens,
			&r.Usage.CacheReadTokens, &r.Usage.CacheCreationTokens,
			&r.DurationMs, &r.StatusCode, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan session request: %w", err)
		}
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate session requests: %w", err)
	}
	return results, nil
}

// QueryRequests retrieves requests matching the given filter criteria (session,
// model, time range) with optional pagination. Results are ordered by creation
// time descending.
func (p *PostgresBackend) QueryRequests(ctx context.Context, filter types.RequestFilter) ([]types.StoredRequest, error) {
	query := `SELECT id, session_id, model, method, path, request_body, response_body,
		 input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
		 duration_ms, status_code, (EXTRACT(EPOCH FROM created_at) * 1000)::bigint
		 FROM requests`
	var conditions []string
	var args []any
	argIdx := 1

	if filter.SessionID != nil {
		conditions = append(conditions, fmt.Sprintf("session_id = $%d", argIdx))
		args = append(args, *filter.SessionID)
		argIdx++
	}
	if filter.Model != nil {
		conditions = append(conditions, fmt.Sprintf("model = $%d", argIdx))
		args = append(args, *filter.Model)
		argIdx++
	}
	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIdx))
		args = append(args, time.UnixMilli(*filter.From))
		argIdx++
	}
	if filter.To != nil {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIdx))
		args = append(args, time.UnixMilli(*filter.To))
		argIdx++
	}
	if len(conditions) > 0 {
		query += " WHERE " + conditions[0]
		for i := 1; i < len(conditions); i++ {
			query += " AND " + conditions[i]
		}
	}
	query += " ORDER BY created_at DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, filter.Limit)
		argIdx++
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIdx)
		args = append(args, filter.Offset)
		argIdx++
	}

	rows, err := p.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query requests: %w", err)
	}
	defer rows.Close()
	results := make([]types.StoredRequest, 0)
	for rows.Next() {
		var r types.StoredRequest
		if err := rows.Scan(&r.ID, &r.SessionID, &r.Model, &r.Method, &r.Path,
			&r.Request, &r.Response,
			&r.Usage.InputTokens, &r.Usage.OutputTokens,
			&r.Usage.CacheReadTokens, &r.Usage.CacheCreationTokens,
			&r.DurationMs, &r.StatusCode, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan query result: %w", err)
		}
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate query results: %w", err)
	}
	return results, nil
}

// Close shuts down the PostgreSQL connection pool.
func (p *PostgresBackend) Close() error {
	p.pool.Close()
	return nil
}
