import { useEffect, useMemo, useState } from 'react'
import PageHeader from './components/PageHeader'

type PerModelStat = {
  model: string; requests: number; tokens: number; cost_usd: number; error_rate: number
}

type Stats = {
  per_model: PerModelStat[]
  total_requests: number; total_tokens: number
}

function fmtNum(n: number) { return n.toLocaleString() }
function fmtCost(n: number) { return `$${n.toFixed(4)}` }

export default function ModelAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [sortKey, setSortKey] = useState<string>('requests')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    setError(false)
    fetch('/api/stats').then(r => r.json()).then(data => { setStats(data); setLoading(false) }).catch(() => { setError(true); setLoading(false) })
  }, [retryCount])

  const sortedModels = useMemo(() => {
    if (!stats?.per_model) return []
    return [...stats.per_model].sort((a, b) => {
      const aVal = a[sortKey as keyof PerModelStat]
      const bVal = b[sortKey as keyof PerModelStat]
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string)
      }
      return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    })
  }, [stats, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortHeader = ({ label, sortKey: sk }: { label: string; sortKey: string }) => (
    <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort(sk)}>
      {label} {sortKey === sk ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
    </th>
  )

  const maxTokens = sortedModels.length > 0 ? Math.max(...sortedModels.map(m => m.tokens)) : 0

  if (error) {
    return (
      <div>
        <PageHeader title="Model Analytics" description="Per-model performance metrics" breadcrumbs={[{ label: 'Dashboard' }, { label: 'Models' }]} />
        <div className="text-center py-20 text-zinc-500">
          <p className="text-base">Failed to load data</p>
          <button onClick={() => { setError(false); setRetryCount(c => c + 1) }}
            className="mt-3 text-sm text-cyan-400 hover:text-cyan-300">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Model Analytics" description="Per-model performance metrics" breadcrumbs={[{ label: 'Dashboard' }, { label: 'Models' }]} />

      {/* Model cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-900 rounded-xl animate-pulse" />)}
        </div>
      ) : sortedModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {sortedModels.map(m => (
            <div key={m.model} className="bg-zinc-900 rounded-xl p-5 border-l-2 border-cyan-500">
              <h3 className="text-sm font-semibold text-cyan-400 font-mono mb-3 truncate">{m.model}</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500">Requests</span>
                  <p className="text-zinc-200 font-mono tabular-nums mt-0.5">{fmtNum(m.requests)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Tokens</span>
                  <p className="text-zinc-200 font-mono tabular-nums mt-0.5">{fmtNum(m.tokens)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Cost</span>
                  <p className="text-zinc-200 font-mono tabular-nums mt-0.5">{fmtCost(m.cost_usd)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Error Rate</span>
                  <p className={`font-mono tabular-nums mt-0.5 ${m.error_rate > 0.1 ? 'text-rose-400' : m.error_rate > 0.05 ? 'text-amber-400' : 'text-zinc-200'}`}>
                    {(m.error_rate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Sortable table */}
      <h3 className="text-sm font-semibold text-zinc-200 mb-3">All Models</h3>
      {loading ? (
        <div className="bg-zinc-900 rounded-xl p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}</div>
      ) : sortedModels.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl text-center py-12 text-zinc-500"><p>No model data yet</p></div>
      ) : (
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-500 text-xs uppercase tracking-wider">
                <SortHeader label="Model" sortKey="model" />
                <SortHeader label="Requests" sortKey="requests" />
                <SortHeader label="Tokens" sortKey="tokens" />
                <SortHeader label="Cost" sortKey="cost_usd" />
                <SortHeader label="Error Rate" sortKey="error_rate" />
              </tr>
            </thead>
            <tbody>
              {sortedModels.map(m => (
                <tr key={m.model} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-zinc-200">{m.model}</td>
                  <td className="px-4 py-3 text-right text-zinc-400 font-mono tabular-nums">{fmtNum(m.requests)}</td>
                  <td className="px-4 py-3 text-right relative">
                    <span className="relative z-10 font-mono text-zinc-300 tabular-nums">{fmtNum(m.tokens)}</span>
                    {maxTokens > 0 && (
                      <div className="absolute inset-y-0 right-0 bg-cyan-500/10 rounded-l" style={{ width: `${(m.tokens / maxTokens) * 100}%` }} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 font-mono tabular-nums">{fmtCost(m.cost_usd)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    <span className={m.error_rate > 0.1 ? 'text-rose-400' : m.error_rate > 0.05 ? 'text-amber-400' : 'text-zinc-400'}>
                      {(m.error_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
