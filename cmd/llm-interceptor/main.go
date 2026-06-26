package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/chingjustwe/llm-interceptor/internal/config"
	"github.com/chingjustwe/llm-interceptor/internal/plugin"
	"github.com/chingjustwe/llm-interceptor/internal/proxy"
	"github.com/chingjustwe/llm-interceptor/internal/storage"
	"github.com/chingjustwe/llm-interceptor/internal/state"
)

func main() {
	cfgPath := "config.yaml"
	if len(os.Args) > 1 {
		cfgPath = os.Args[1]
	}
	cfg, err := config.Load(cfgPath)
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// Initialize storage
	var store storage.Backend
	switch cfg.Storage.Type {
	case "sqlite":
		s, err := storage.NewSQLite(cfg.StoragePath())
		if err != nil {
			log.Fatalf("failed to init storage: %v", err)
		}
		store = s
		defer store.Close()
	default:
		log.Fatalf("unknown storage type: %s", cfg.Storage.Type)
	}
	_ = store

	// Initialize state store
	var st state.Backend
	switch cfg.StateStore.Type {
	case "memory":
		st = state.NewMemory()
		defer st.Close()
	default:
		log.Fatalf("unknown state store type: %s", cfg.StateStore.Type)
	}
	_ = st

	// Initialize proxy
	disp := plugin.NewDispatcher(nil)

	target, err := proxy.New("anthropic", cfg.Upstream)
	if err != nil {
		log.Fatalf("failed to init proxy: %v", err)
	}

	// HTTP server
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RealIP)

	r.Post("/v1/messages", func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		isStream := strings.Contains(r.Header.Get("Accept"), "text/event-stream")
		if r.Header.Get("Content-Type") == "application/json" {
			var rb map[string]any
			if json.Unmarshal(body, &rb) == nil {
				if s, ok := rb["stream"].(bool); ok {
					isStream = isStream || s
				}
			}
		}

		reqCtx := disp.WrapContext(r.Context())
		reqCtx.ID = fmt.Sprintf("req_%d", time.Now().UnixNano())
		reqCtx.Method = r.Method
		reqCtx.Path = r.URL.Path
		reqCtx.Body = body
		reqCtx.SessionID = r.Header.Get("x-claude-code-session-id")
		reqCtx.AgentID = r.Header.Get("x-claude-code-agent-id")
		reqCtx.Headers = make(map[string]string)
		for k, v := range r.Header {
			reqCtx.Headers[k] = strings.Join(v, ", ")
		}

		hookResult, err := disp.ExecuteOnRequest(reqCtx)
		if err != nil {
			log.Printf("plugin error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		if hookResult != nil && hookResult.Block {
			http.Error(w, hookResult.Reason, hookResult.StatusCode)
			return
		}

		var respCtx plugin.ResponseContext
		respCtx.RequestID = reqCtx.ID
		respCtx.SessionID = reqCtx.SessionID
		respCtx.Metadata = reqCtx.Metadata

		var model struct {
			Model string `json:"model"`
		}
		if json.Unmarshal(body, &model) == nil {
			respCtx.Model = model.Model
		}

		if isStream {
			usage, toolCalls, stopReason, duration, err := target.HandleRequestStream(body, reqCtx.Headers, w)
			if err != nil {
				log.Printf("proxy stream error: %v", err)
				return
			}
			if usage != nil {
				respCtx.Usage = plugin.Usage(*usage)
			}
			for _, tc := range toolCalls {
				respCtx.ToolCalls = append(respCtx.ToolCalls, plugin.ToolCall(tc))
			}
			respCtx.StopReason = stopReason
			respCtx.DurationMs = duration
			respCtx.StatusCode = http.StatusOK
		} else {
			pr, err := target.HandleRequest(body, reqCtx.Headers)
			if err != nil {
				log.Printf("proxy error: %v", err)
				http.Error(w, "upstream error", http.StatusBadGateway)
				return
			}
			respCtx.StatusCode = pr.StatusCode
			respCtx.DurationMs = pr.DurationMs
			usage, toolCalls, stopReason := proxy.ExtractUsage(pr.Body)
			respCtx.Usage = plugin.Usage(usage)
			for _, tc := range toolCalls {
				respCtx.ToolCalls = append(respCtx.ToolCalls, plugin.ToolCall(tc))
			}
			respCtx.StopReason = stopReason

			for k, v := range pr.Headers {
				w.Header().Set(k, v)
			}
			if w.Header().Get("Content-Type") == "" {
				w.Header().Set("Content-Type", "application/json")
			}
			w.WriteHeader(pr.StatusCode)
			w.Write(pr.Body)
		}

		if err := disp.ExecuteOnResponse(&respCtx); err != nil {
			log.Printf("plugin response error: %v", err)
		}
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	server := &http.Server{
		Addr:    cfg.Listen,
		Handler: r,
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("shutting down...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		server.Shutdown(shutdownCtx)
	}()

	log.Printf("LLM Interceptor listening on %s", cfg.Listen)
	log.Printf("Upstream: %s", cfg.Upstream)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
