import { useCallback, useEffect, useState } from 'react'
import { useAuthedFetch } from './auth'

type SectionProps = {
  title: string
  description: string
  children: React.ReactNode
  onSave: () => void
  saving: boolean
  hasChanges: boolean
}

function ConfigSection({ title, description, children, onSave, saving, hasChanges }: SectionProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        {hasChanges && (
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
      <div className="px-5 py-4 space-y-3">
        {children}
      </div>
    </div>
  )
}

type NumberInputProps = {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
}

function NumberInput({ label, value, onChange, step, min }: NumberInputProps) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 font-medium mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
      />
    </div>
  )
}

type TagInputProps = {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

function TagInput({ label, tags, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div>
      <label className="block text-xs text-zinc-500 font-medium mb-1">{label}</label>
      <div className="flex gap-2 mb-2 flex-wrap">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md">
            {tag}
            <button onClick={() => removeTag(tag)} className="text-zinc-500 hover:text-rose-400 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder={placeholder || 'Add...'}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        >
          Add
        </button>
      </div>
    </div>
  )
}

type ProviderEntry = {
  name: string
  base_url: string
  model_glob: string
  api_key: string
}

type ProviderListProps = {
  providers: ProviderEntry[]
  onChange: (providers: ProviderEntry[]) => void
}

function ProviderList({ providers, onChange }: ProviderListProps) {
  const update = (i: number, field: keyof ProviderEntry, value: string) => {
    const next = providers.map((p, idx) => (idx === i ? { ...p, [field]: value } : p))
    onChange(next)
  }

  const addRow = () => {
    onChange([...providers, { name: '', base_url: '', model_glob: '', api_key: '' }])
  }

  const removeRow = (i: number) => {
    onChange(providers.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div className="space-y-3">
        {providers.map((p, i) => (
          <div key={i} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-0.5">Name</label>
                <input value={p.name} onChange={(e) => update(i, 'name', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500" placeholder="anthropic" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-0.5">Model Glob</label>
                <input value={p.model_glob} onChange={(e) => update(i, 'model_glob', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500" placeholder="claude-*" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-0.5">Base URL</label>
                <input value={p.base_url} onChange={(e) => update(i, 'base_url', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500" placeholder="https://api.anthropic.com" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-0.5">API Key</label>
                <input type="password" value={p.api_key} onChange={(e) => update(i, 'api_key', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500" placeholder="sk-..." />
              </div>
            </div>
            <button onClick={() => removeRow(i)} className="text-rose-400 hover:text-rose-300 text-[11px] font-medium transition-colors">Remove</button>
          </div>
        ))}
      </div>
      <button onClick={addRow} className="mt-2 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors">+ Add Provider</button>
    </div>
  )
}

type PriceEntry = {
  model: string
  input_per_m: number
  output_per_m: number
}

export default function AdminConfig() {
  const authedFetch = useAuthedFetch()
  const [toast, setToast] = useState<string | null>(null)

  // Budget
  const [budget, setBudget] = useState({ max_cost_per_session: 0, max_cost_per_day: 0 })
  const [budgetOrig, setBudgetOrig] = useState(budget)
  const [savingBudget, setSavingBudget] = useState(false)

  // Rate Limit
  const [rateLimit, setRateLimit] = useState({ requests_per_minute: 0, tokens_per_minute: 0 })
  const [rateLimitOrig, setRateLimitOrig] = useState(rateLimit)
  const [savingRateLimit, setSavingRateLimit] = useState(false)

  // Tool Policy
  const [toolPolicy, setToolPolicy] = useState<{ blocked_tools: string[]; allowed_tools: string[] }>({ blocked_tools: [], allowed_tools: [] })
  const [toolPolicyOrig, setToolPolicyOrig] = useState(toolPolicy)
  const [savingToolPolicy, setSavingToolPolicy] = useState(false)

  // Pricing
  const [prices, setPrices] = useState<PriceEntry[]>([])
  const [pricesOrig, setPricesOrig] = useState<PriceEntry[]>([])
  const [savingPrices, setSavingPrices] = useState(false)

  // Providers
  const [providers, setProviders] = useState<ProviderEntry[]>([])
  const [providersOrig, setProvidersOrig] = useState<ProviderEntry[]>([])
  const [savingProviders, setSavingProviders] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadConfig = useCallback(async (key: string, fallback: any): Promise<any> => {
    const resp = await authedFetch(`/api/admin/config/${key}`)
    if (resp.status === 404) return fallback
    if (!resp.ok) return fallback
    const entry = await resp.json()
    return entry.value
  }, [authedFetch])

  const saveConfig = useCallback(async (key: string, value: any): Promise<boolean> => {
    const resp = await authedFetch(`/api/admin/config/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'save failed' }))
      showToast(`Failed to save ${key}: ${err.error}`)
      return false
    }
    showToast(`${key} configuration saved`)
    return true
  }, [authedFetch, showToast])

  useEffect(() => {
    loadConfig('budget', { max_cost_per_session: 0, max_cost_per_day: 0 }).then((v) => {
      setBudget(v)
      setBudgetOrig(v)
    })
    loadConfig('rate-limit', { requests_per_minute: 0, tokens_per_minute: 0 }).then((v) => {
      setRateLimit(v)
      setRateLimitOrig(v)
    })
    loadConfig('tool-policy', { blocked_tools: [], allowed_tools: [] }).then((v) => {
      setToolPolicy(v)
      setToolPolicyOrig(v)
    })
    loadConfig('cost-tracker', { prices: {} }).then((v) => {
      const entries: PriceEntry[] = Object.entries(v.prices || {}).map(([model, p]: [string, any]) => ({
        model,
        input_per_m: p.input_per_m || 0,
        output_per_m: p.output_per_m || 0,
      }))
      setPrices(entries)
      setPricesOrig(entries)
    })
    loadConfig('router', { providers: [] }).then((v) => {
      setProviders(v.providers || [])
      setProvidersOrig(v.providers || [])
    })
  }, [loadConfig])

  const hasBudgetChanges = JSON.stringify(budget) !== JSON.stringify(budgetOrig)
  const hasRateLimitChanges = JSON.stringify(rateLimit) !== JSON.stringify(rateLimitOrig)
  const hasToolPolicyChanges = JSON.stringify(toolPolicy) !== JSON.stringify(toolPolicyOrig)
  const hasPricesChanges = JSON.stringify(prices) !== JSON.stringify(pricesOrig)
  const hasProvidersChanges = JSON.stringify(providers) !== JSON.stringify(providersOrig)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Configuration</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Edit runtime settings. Changes take effect immediately without restarting the gateway.</p>
      </div>

      <div className="space-y-5 max-w-2xl">
        <ConfigSection
          title="Budget"
          description="Per-session and daily cost limits"
          onSave={async () => { setSavingBudget(true); if (await saveConfig('budget', budget)) setBudgetOrig({ ...budget }); setSavingBudget(false) }}
          saving={savingBudget}
          hasChanges={hasBudgetChanges}
        >
          <NumberInput label="Max cost per session ($)" value={budget.max_cost_per_session} onChange={(v) => setBudget({ ...budget, max_cost_per_session: v })} step={0.1} min={0} />
          <NumberInput label="Max cost per day ($)" value={budget.max_cost_per_day} onChange={(v) => setBudget({ ...budget, max_cost_per_day: v })} step={0.1} min={0} />
        </ConfigSection>

        <ConfigSection
          title="Rate Limit"
          description="Per-minute request and token limits"
          onSave={async () => { setSavingRateLimit(true); if (await saveConfig('rate-limit', rateLimit)) setRateLimitOrig({ ...rateLimit }); setSavingRateLimit(false) }}
          saving={savingRateLimit}
          hasChanges={hasRateLimitChanges}
        >
          <NumberInput label="Requests per minute" value={rateLimit.requests_per_minute} onChange={(v) => setRateLimit({ ...rateLimit, requests_per_minute: v })} min={0} />
          <NumberInput label="Tokens per minute" value={rateLimit.tokens_per_minute} onChange={(v) => setRateLimit({ ...rateLimit, tokens_per_minute: v })} min={0} />
        </ConfigSection>

        <ConfigSection
          title="Tool Policy"
          description="Block or allow specific tool names"
          onSave={async () => { setSavingToolPolicy(true); if (await saveConfig('tool-policy', toolPolicy)) setToolPolicyOrig({ ...toolPolicy, blocked_tools: [...toolPolicy.blocked_tools], allowed_tools: [...toolPolicy.allowed_tools] }); setSavingToolPolicy(false) }}
          saving={savingToolPolicy}
          hasChanges={hasToolPolicyChanges}
        >
          <TagInput label="Blocked Tools" tags={toolPolicy.blocked_tools} onChange={(tags) => setToolPolicy({ ...toolPolicy, blocked_tools: tags })} placeholder="Tool name (e.g. Bash)" />
          <TagInput label="Allowed Tools" tags={toolPolicy.allowed_tools} onChange={(tags) => setToolPolicy({ ...toolPolicy, allowed_tools: tags })} placeholder="Tool name (e.g. Read)" />
        </ConfigSection>

        <ConfigSection
          title="Pricing"
          description="Per-model token pricing (per million tokens)"
          onSave={async () => {
            setSavingPrices(true)
            const priceMap: Record<string, { input_per_m: number; output_per_m: number }> = {}
            prices.forEach((p) => { priceMap[p.model] = { input_per_m: p.input_per_m, output_per_m: p.output_per_m } })
            if (await saveConfig('cost-tracker', { prices: priceMap })) setPricesOrig(prices.map((p) => ({ ...p })))
            setSavingPrices(false)
          }}
          saving={savingPrices}
          hasChanges={hasPricesChanges}
        >
          {prices.map((p, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-0.5">Model</label>
                <input
                  value={p.model}
                  onChange={(e) => {
                    const next = [...prices]
                    next[i] = { ...next[i], model: e.target.value }
                    setPrices(next)
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                  placeholder="claude-sonnet-4"
                />
              </div>
              <NumberInput label="Input $/1M" value={p.input_per_m} onChange={(v) => {
                const next = [...prices]
                next[i] = { ...next[i], input_per_m: v }
                setPrices(next)
              }} step={0.01} min={0} />
              <div className="flex gap-1 items-end">
                <div className="flex-1">
                  <NumberInput label="Output $/1M" value={p.output_per_m} onChange={(v) => {
                    const next = [...prices]
                    next[i] = { ...next[i], output_per_m: v }
                    setPrices(next)
                  }} step={0.01} min={0} />
                </div>
                <button
                  onClick={() => setPrices(prices.filter((_, idx) => idx !== i))}
                  className="text-rose-400 hover:text-rose-300 text-xs mb-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setPrices([...prices, { model: '', input_per_m: 0, output_per_m: 0 }])}
            className="text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors"
          >
            + Add Model Price
          </button>
        </ConfigSection>

        <ConfigSection
          title="Providers"
          description="Router upstream LLM providers"
          onSave={async () => { setSavingProviders(true); if (await saveConfig('router', { providers })) setProvidersOrig(providers.map((p) => ({ ...p }))); setSavingProviders(false) }}
          saving={savingProviders}
          hasChanges={hasProvidersChanges}
        >
          <ProviderList providers={providers} onChange={setProviders} />
        </ConfigSection>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-lg text-sm shadow-xl z-50 animate-in">
          {toast}
        </div>
      )}
    </div>
  )
}
