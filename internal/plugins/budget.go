// BudgetPlugin checks accumulated LLM costs against per-session and per-day
// budget limits, blocking requests that would exceed configured thresholds.

package plugins

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/chingjustwe/llm-interceptor/internal/plugin"
	"github.com/chingjustwe/llm-interceptor/internal/state"
)

// microsPerDollar is the number of microdollars in one USD. Costs are stored
// in the state backend as int64 microdollars for integer precision.
const microsPerDollar = 1_000_000

// BudgetPlugin implements the Plugin interface to enforce cost budgets. It
// reads accumulated costs from the state backend (populated by CostTracker)
// and blocks requests when per-session or per-day limits are exceeded.
type BudgetPlugin struct {
	state         state.Backend
	maxPerSession float64
	maxPerDay     float64
}

// NewBudgetPlugin creates a BudgetPlugin with the given state backend and
// budget limits. A limit of 0 or less means unlimited for that dimension.
func NewBudgetPlugin(st state.Backend, maxPerSession, maxPerDay float64) *BudgetPlugin {
	return &BudgetPlugin{
		state:         st,
		maxPerSession: maxPerSession,
		maxPerDay:     maxPerDay,
	}
}

// Name returns "budget" as the plugin identifier.
func (b *BudgetPlugin) Name() string { return "budget" }

// ReloadConfig updates budget limits from a runtime configuration change.
// The key must be "budget" and the value must be a JSON object with optional
// max_cost_per_session and/or max_cost_per_day fields.
func (b *BudgetPlugin) ReloadConfig(key string, value []byte) error {
	if key != "budget" {
		return nil
	}
	var cfg struct {
		MaxPerSession float64 `json:"max_cost_per_session"`
		MaxPerDay     float64 `json:"max_cost_per_day"`
	}
	if err := json.Unmarshal(value, &cfg); err != nil {
		return fmt.Errorf("budget: invalid config: %w", err)
	}
	b.maxPerSession = cfg.MaxPerSession
	b.maxPerDay = cfg.MaxPerDay
	return nil
}

// OnRequest checks accumulated costs against configured budget limits. Costs
// are stored in the state backend as microdollars by the CostTracker plugin.
// Returns a blocking HookResult with status 402 if either limit is exceeded.
func (b *BudgetPlugin) OnRequest(ctx *plugin.RequestContext) (*plugin.HookResult, error) {
	if b.maxPerSession > 0 {
		costMicro, err := b.state.Get(ctx.Context, "cost:session:"+ctx.SessionID)
		if err == nil && float64(costMicro)/microsPerDollar >= b.maxPerSession {
			return &plugin.HookResult{
				Block:      true,
				Reason:     fmt.Sprintf("session budget exceeded (max $%.2f)", b.maxPerSession),
				StatusCode: 402,
				ErrorType:  "invalid_request_error",
			}, nil
		}
	}
	if b.maxPerDay > 0 {
		today := time.Now().UTC().Format("2006-01-02")
		costMicro, err := b.state.Get(ctx.Context, "cost:daily:"+today)
		if err == nil && float64(costMicro)/microsPerDollar >= b.maxPerDay {
			return &plugin.HookResult{
				Block:      true,
				Reason:     fmt.Sprintf("daily budget exceeded (max $%.2f)", b.maxPerDay),
				StatusCode: 402,
				ErrorType:  "invalid_request_error",
			}, nil
		}
	}
	return nil, nil
}

// OnResponse is a no-op for the budget plugin; all checks happen on request.
func (b *BudgetPlugin) OnResponse(ctx *plugin.ResponseContext) error {
	return nil
}
