import { useEffect, useState } from 'react'

type PerModelStat = {
  model: string
  requests: number
  tokens: number
}

type Stats = {
  daily_cost: number
  total_cost: number
  total_requests: number
  total_tokens: number
  per_model: PerModelStat[]
}

function formatNum(n: number): string {
  return n.toLocaleString()
}

function formatCost(n: number): string {
  return n.toFixed(4)
}

export default function CostDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-5">Cost Dashboard</h2>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-5">Cost Dashboard</h2>
        <div className="text-center py-20 text-zinc-500">
          <p className="text-base">Unable to load stats</p>
          <p className="text-sm mt-1 text-zinc-600">Check that the backend is running and try again.</p>
        </div>
      </div>
    )
  }

  const hasData = stats.total_requests > 0

  const maxTokens = stats.per_model && stats.per_model.length > 0
    ? Math.max(...stats.per_model.map((m) => m.tokens))
    : 0

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100 mb-5">Cost Dashboard</h2>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900 rounded-xl p-5 border-l-2 border-cyan-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/5 to-transparent rounded-bl-full" />
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1">Daily Cost</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent tabular-nums">
            {hasData ? `$${formatCost(stats.daily_cost)}` : '—'}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border-l-2 border-indigo-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-bl-full" />
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1">Total Cost</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent tabular-nums">
            {hasData ? `$${formatCost(stats.total_cost)}` : '—'}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1">Total Requests</p>
          <p className="text-3xl font-bold text-zinc-100 tabular-nums">
            {hasData ? formatNum(stats.total_requests) : '—'}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1">Total Tokens</p>
          <p className="text-3xl font-bold text-zinc-100 tabular-nums">
            {hasData ? formatNum(stats.total_tokens) : '—'}
          </p>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Per-Model Breakdown</h3>
      {stats.per_model && stats.per_model.length > 0 ? (
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Model</th>
                  <th className="text-right px-4 py-3 font-medium">Requests</th>
                  <th className="text-right px-4 py-3 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {stats.per_model.map((m, i) => (
                  <tr key={m.model} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-zinc-200">{m.model}</td>
                    <td className="px-4 py-3 text-right text-zinc-400 font-mono tabular-nums">{formatNum(m.requests)}</td>
                    <td className="px-4 py-3 text-right relative">
                      <span className="relative z-10 font-mono text-zinc-300 tabular-nums">{formatNum(m.tokens)}</span>
                      {maxTokens > 0 && (
                        <div
                          className="absolute inset-y-0 right-0 bg-cyan-500/10 rounded-l"
                          style={{ width: `${(m.tokens / maxTokens) * 100}%` }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-500 bg-zinc-900 rounded-xl">
          <p>No model data yet</p>
        </div>
      )}
    </div>
  )
}
