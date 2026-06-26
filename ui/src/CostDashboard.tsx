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
      <div className="grid grid-cols-2 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-slate-800 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg">Unable to load stats</p>
        <p className="text-sm mt-1">Check that the backend is running and try again.</p>
      </div>
    )
  }

  const hasData = stats.total_requests > 0

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-800 rounded p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Daily Cost</p>
          <p className="text-3xl font-bold text-emerald-400">
            {hasData ? formatNum(stats.daily_cost) : '—'}
          </p>
        </div>
        <div className="bg-slate-800 rounded p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Total Cost</p>
          <p className="text-3xl font-bold text-blue-400">
            {hasData ? formatNum(stats.total_cost) : '—'}
          </p>
        </div>
        <div className="bg-slate-800 rounded p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Total Requests</p>
          <p className="text-3xl font-bold text-slate-100">
            {hasData ? formatNum(stats.total_requests) : '—'}
          </p>
        </div>
        <div className="bg-slate-800 rounded p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Total Tokens</p>
          <p className="text-3xl font-bold text-slate-100">
            {hasData ? formatNum(stats.total_tokens) : '—'}
          </p>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-3 text-slate-200">Per-Model Breakdown</h3>
      {stats.per_model && stats.per_model.length > 0 ? (
        <div className="bg-slate-800 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700 text-slate-400 text-xs uppercase">
                <th className="text-left px-4 py-3 font-medium">Model</th>
                <th className="text-right px-4 py-3 font-medium">Requests</th>
                <th className="text-right px-4 py-3 font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {stats.per_model.map((m, i) => (
                <tr key={m.model} className={i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                  <td className="px-4 py-3 font-mono text-slate-200">{m.model}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{formatNum(m.requests)}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{formatNum(m.tokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p>No model data yet</p>
        </div>
      )}
    </div>
  )
}
